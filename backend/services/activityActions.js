import { Op } from 'sequelize';
import * as models from '../models/index.js';
import sequelize from '../config/database.js';
import { ActivityOperation, ActivityChange, ActivityReversal, ActivityDelivery } from '../models/activity.js';
import { getHistoricalBilling } from '../utils/historicalBilling.js';
import { changedFields, consolidateChanges, previewHash, recordKey, sameValues, snapshot } from '../utils/activityValues.js';
import { ensureActivity, getActivityContext } from './activityContext.js';

const reversible = new Set(['Session','UOM','ItemCategory','Item','Store','ItemStore','ExpenseType','IncomeType',
  'Concern','SpecialFoodItem','Supplier','Department','HostelFacilityType','AdditionalCollectionType',
  'Attendance','MonthlyAttendanceImport','Holiday','RoomAllotment','HostelRoom','RoomType','HostelLayout','RoomRequest',
  'Leave','Complaint','Suspension','DayReductionRequest','Rebate','AdditionalCollection','MessDailyExpense','AdditionalIncome',
  'FoodOrder','FoodOrderItem','StudentFee','Enrollment','Recipe','RecipeItem','Menu','MenuItem','MenuSchedule',
  'InventoryBatch','ItemStock','InventoryTransaction','DailyConsumption','ConsumptionLog','RestockPlan','PurchaseOrder','PurchaseOrderItem']);
export const editableFields = {
  Session:['name','start_date','end_date','is_active'], UOM:['name','abbreviation','type'],
  ItemCategory:['name','description'], ExpenseType:['name','description'], IncomeType:['name','description'],
  Concern:['name','description','is_active'], Store:['name','address','contact_number','is_active'],
  SpecialFoodItem:['name','description','price','category','is_available'],
  MessDailyExpense:['amount','expense_date','description'], AdditionalIncome:['amount','received_date','description'],
};
const closedPeriodModels = new Set(['Attendance','MonthlyAttendanceImport','StudentFee','MessDailyExpense','AdditionalIncome',
  'FoodOrder','DailyConsumption','SpecialConsumption','InventoryBatch','InventoryTransaction']);
export const activityError = (message, status=409) => Object.assign(new Error(message),{status});
export function requireReason(value) {
  const reason=String(value || '').trim();
  if(reason.length<5 || reason.length>500)throw activityError('Enter a reason between 5 and 500 characters.',400);
  return reason;
}
export function modelPolicy(change) {
  if (change.model_name === 'DayReductionRequest' || (change.model_name === 'Attendance' && (change.before_values?.reduction_request_id || change.after_values?.reduction_request_id))) return 'Use the mess reduction cancellation or resubmission workflow to keep approval, attendance, and billing consistent.';
  if(!reversible.has(change.model_name))return `${change.model_name} requires its dedicated management workflow.`;
  if(change.model_name==='Enrollment' && changedFields(change.before_values,change.after_values).some(field=>!['remaining_dues','updatedAt'].includes(field))) {
    return 'Admission changes must be corrected through student management.';
  }
  if(change.model_name==='FoodOrder' && [change.before_values?.payment_status,change.after_values?.payment_status].includes('paid')) return 'Paid orders require an adjustment.';
  if(change.model_name==='StudentFee' && [change.before_values?.status,change.after_values?.status].includes('paid'))return 'Paid fees require an adjustment.';
  if(change.model_name==='AdditionalCollection' && [change.before_values?.status,change.after_values?.status].includes('collected'))return 'Collected payments require an adjustment.';
  return null;
}
async function loadChanges(id,transaction) {
  const changes=await ActivityChange.findAll({where:{operation_id:id},order:[['id','ASC']],transaction,raw:true});
  return consolidateChanges(changes);
}
async function currentRow(change,transaction,lock=false) {
  const model=models[change.model_name];
  if(!model)return null;
  return model.findOne({where:change.primary_key,transaction,...(lock?{lock:transaction.LOCK.UPDATE}:{})});
}
async function periodBlock(change,transaction) {
  if(!closedPeriodModels.has(change.model_name))return null;
  for(const values of [change.before_values,change.after_values].filter(Boolean)) {
    const date=values.date || values.expense_date || values.received_date || values.order_date || values.consumption_date || values.purchase_date || values.transaction_date;
    const year=Number(values.year || (date && String(date).slice(0,4)));
    const month=Number(values.month || (date && String(date).slice(5,7)));
    if(!year || !month || !values.hostel_id)continue;
    if(await getHistoricalBilling(values.hostel_id,month,year))return 'This period contains protected imported bills.';
    if(await models.MessBill.count({where:{hostel_id:values.hostel_id,month,year},transaction}))return 'Bills exist for this period. Automatic changes are blocked; these billing records require a dedicated correction.';
  }
  return null;
}
const tableName=model=>typeof model.getTableName()==='string'?model.getTableName():model.getTableName().tableName;
async function dependencyBlocks(changes,transaction) {
  const blockers=[];
  const plan=new Map(changes.map(change=>[`${change.model_name}:${change.record_key}`,change]));
  for(const target of changes.filter(change=>!change.before_values && change.after_values)) {
    const targetModel=models[target.model_name];
    for(const model of Object.values(models).filter(model=>model?.rawAttributes)) {
      for(const [attribute,definition] of Object.entries(model.rawAttributes)) {
        const reference=definition.references;
        if(!reference)continue;
        const referencedTable=typeof reference.model==='string'?reference.model:reference.model.tableName;
        if(referencedTable!==tableName(targetModel))continue;
        const targetAttribute=Object.keys(targetModel.rawAttributes).find(key=>(targetModel.rawAttributes[key].field||key)===reference.key);
        const value=target.after_values[targetAttribute];
        if(value===undefined)continue;
        const dependents=await model.findAll({where:{[attribute]:value},transaction,
          attributes:[...new Set([...model.primaryKeyAttributes,attribute])],raw:true,limit:1001});
        for(const dependent of dependents) {
          const key=recordKey(Object.fromEntries(model.primaryKeyAttributes.map(key=>[key,dependent[key]])));
          const undo=plan.get(`${model.name}:${key}`);
          if(!undo || undo.before_values?.[attribute]===value) {
            blockers.push(`${target.model_name} is still referenced by ${model.name}.`);break;
          }
        }
      }
    }
  }
  return blockers;
}
function reversalOrder(changes) {
  const nodes=new Map(changes.map(change=>[`${change.model_name}:${change.record_key}`,change]));
  const edges=new Map([...nodes.keys()].map(key=>[key,new Set()]));
  const indegree=new Map([...nodes.keys()].map(key=>[key,0]));
  const link=(before,after)=>{if(before===after || edges.get(before).has(after))return;edges.get(before).add(after);indegree.set(after,indegree.get(after)+1);};
  for(const [childKey,child] of nodes) {
    const model=models[child.model_name];
    for(const [field,definition] of Object.entries(model.rawAttributes)) {
      const reference=definition.references;if(!reference)continue;
      const table=typeof reference.model==='string'?reference.model:reference.model.tableName;
      for(const [parentKey,parent] of nodes) {
        const parentModel=models[parent.model_name];if(tableName(parentModel)!==table)continue;
        const parentField=Object.keys(parentModel.rawAttributes).find(key=>(parentModel.rawAttributes[key].field||key)===reference.key);
        if(parent.before_values && !parent.after_values && child.before_values?.[field]!=null && child.before_values[field]===parent.before_values[parentField])link(parentKey,childKey);
        if(!parent.before_values && parent.after_values && child.after_values?.[field]!=null && child.after_values[field]===parent.after_values[parentField] && child.before_values?.[field]!==child.after_values[field])link(childKey,parentKey);
      }
    }
  }
  const ready=[...nodes.keys()].reverse().filter(key=>indegree.get(key)===0),ordered=[];
  while(ready.length){const key=ready.pop();ordered.push(nodes.get(key));for(const next of edges.get(key)){indegree.set(next,indegree.get(next)-1);if(indegree.get(next)===0)ready.push(next);}}
  if(ordered.length!==changes.length)throw activityError('These records have circular dependencies and require their dedicated correction workflow.');
  return ordered;
}

export async function previewReversal(id,transaction,lock=false) {
  const operation=await ActivityOperation.findByPk(id,{transaction,...(lock?{lock:transaction.LOCK.UPDATE}:{})});
  if(!operation)throw activityError('Activity not found.',404);
  const blockers=[];
  if(operation.status!=='completed')blockers.push('Only completed activities can be reverted.');
  if(operation.kind!=='activity')blockers.push('A correction or reversal cannot itself be automatically reverted.');
  if(await ActivityReversal.findByPk(id,{transaction}))blockers.push('This activity has already been reverted.');
  const deliveries=await ActivityDelivery.findAll({where:{operation_id:id},transaction,raw:true});
  if(deliveries.length)blockers.push('This activity attempted an external notification. Use its dedicated correction workflow; sent messages cannot be recalled.');
  const changes=await loadChanges(id,transaction);
  if(!changes.length)blockers.push('No reversible record snapshots were recorded for this activity.');
  const rows=[];
  for(const change of changes) {
    const policy=modelPolicy(change);
    if(policy)blockers.push(policy);
    const current=await currentRow(change,transaction,lock);
    if(await ActivityChange.count({where:{model_name:change.model_name,record_key:change.record_key,id:{[Op.gt]:change.id},operation_id:{[Op.ne]:id}},transaction})) {
      blockers.push(`${change.model_name} ${change.record_key} has a later recorded action.`);
    }
    const values=current?snapshot(models[change.model_name],current):null;
    if(!sameValues(values,change.after_values))blockers.push(`${change.model_name} ${change.record_key} changed after this activity.`);
    const period=await periodBlock(change,transaction);if(period)blockers.push(period);
    rows.push({...change,current_values:values,reversal_action:!change.before_values?'delete':!change.after_values?'restore':'update'});
  }
  if(!blockers.length)blockers.push(...await dependencyBlocks(changes,transaction));
  if(!blockers.length){try{reversalOrder(changes);}catch(error){blockers.push(error.message);}}
  return {operation:operation.toJSON(),changes:rows,allowed:!blockers.length,blockers:[...new Set(blockers)],
    token:previewHash(rows.map(row=>({model:row.model_name,key:row.record_key,before:row.before_values,after:row.after_values,current:row.current_values})))};
}

export async function revertActivity(id,reason,token) {
  reason=requireReason(reason);
  const context=getActivityContext();
  context.kind='revert';context.relatedId=id;context.reason=reason;
  await ensureActivity(context);
  return sequelize.transaction(async transaction=>{
    const preview=await previewReversal(id,transaction,true);
    if(!preview.allowed)throw activityError(preview.blockers.join(' '));
    if(!token || token!==preview.token)throw activityError('The activity changed. Open a fresh reversal preview.');
    await ActivityReversal.create({operation_id:id,reversal_id:context.id,reason},{transaction});
    // Order parent restores and child deletes before touching data; one transaction
    // owns the entire reversal, including its audit records and duplicate guard.
    for(const change of reversalOrder(preview.changes)) {
      const model=models[change.model_name];
      const current=await currentRow(change,transaction,true);
      if(!change.before_values)await current.destroy({transaction});
      else if(!current)await model.create(change.before_values,{transaction});
      else await current.update(Object.fromEntries(Object.entries(change.before_values).filter(([key])=>!['createdAt','updatedAt',...model.primaryKeyAttributes].includes(key))),{transaction});
    }
    return {operationId:context.id,records:preview.changes.length};
  });
}

export async function changeActivityRecord(id,changeId,body,mode) {
  const reason=requireReason(body.reason);
  const context=getActivityContext();context.kind=mode;context.relatedId=id;context.reason=reason;
  await ensureActivity(context);
  return sequelize.transaction(async transaction=>{
    const operation=await ActivityOperation.findByPk(id,{transaction});
    const change=await ActivityChange.findOne({where:{id:changeId,operation_id:id},transaction});
    if(!operation || !change)throw activityError('Activity record not found.',404);
    if(!['completed','partial'].includes(operation.status))throw activityError('This activity is still pending or failed.');
    const fields=editableFields[change.model_name];
    if(!fields)throw activityError('Use this record’s management screen to correct it.');
    const model=models[change.model_name];
    const row=await currentRow(change,transaction,true);
    if(!row)throw activityError('This record no longer exists.');
    const values=snapshot(model,row);
    if(!body.token || body.token!==previewHash(values))throw activityError('This record changed. Reopen its details.');
    const period=await periodBlock({...change,before_values:values,after_values:mode==='delete'?null:{...values,...body.values}},transaction);
    if(period)throw activityError(period);
    if(mode==='delete') {
      if(!['MessDailyExpense','AdditionalIncome'].includes(change.model_name))throw activityError('Use the management screen to delete this record and validate its dependencies.');
      await row.destroy({transaction});
    }else{
      const updates=body.values;
      if(!updates || typeof updates!=='object' || Array.isArray(updates))throw activityError('Enter the corrected values.',400);
      if(Object.keys(updates).some(key=>!fields.includes(key) || !model.rawAttributes[key]))throw activityError('The correction contains a field that cannot be edited here.',400);
      if(!Object.keys(updates).length)throw activityError('Enter at least one corrected value.',400);
      if(updates.amount!==undefined && (!Number.isFinite(Number(updates.amount)) || Number(updates.amount)<=0))throw activityError('Amount must be greater than zero.',400);
      if(updates.price!==undefined && (!Number.isFinite(Number(updates.price)) || Number(updates.price)<0))throw activityError('Price cannot be negative.',400);
      if(change.model_name==='Session' && new Date(updates.end_date??values.end_date)<=new Date(updates.start_date??values.start_date))throw activityError('End date must be after start date.',400);
      await row.update(updates,{transaction});
    }
    return {operationId:context.id};
  });
}

export async function activityRecordDetails(change) {
  const row=await currentRow(change);
  const current=row?snapshot(models[change.model_name],row):null;
  const editable=(editableFields[change.model_name]||[]).filter(key=>models[change.model_name]?.rawAttributes[key]);
  return {...change,current_values:current,edit_fields:editable.map(key=>{
    const attribute=models[change.model_name].rawAttributes[key];
    return {key,type:attribute.type.key,values:attribute.values||attribute.type.values||null,nullable:attribute.allowNull!==false};
  }),record_token:previewHash(current),can_delete:['MessDailyExpense','AdditionalIncome'].includes(change.model_name)};
}
