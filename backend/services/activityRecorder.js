import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { ActivityChange } from '../models/activity.js';
import { ensureActivity, getActivityContext, mutationContext } from './activityContext.js';
import { snapshot, primaryKey, recordKey, changedFields } from '../utils/activityValues.js';
import { getNotificationContext } from './notificationContext.js';
import { publishModelNotifications } from './notificationService.js';

const installed = new WeakSet();
const attributes = model => Object.keys(model.rawAttributes).filter(key => model.rawAttributes[key].type?.key !== 'VIRTUAL');
const keyWhere = (model, rows) => ({ [Op.or]: rows.map(row => primaryKey(model, row)) });
async function read(model, where, transaction, limit) {
  return model.findAll({ where, attributes: attributes(model), transaction, raw: true,
    ...(limit ? {limit} : {}), lock: transaction.LOCK.UPDATE });
}
async function dependentSnapshots(model, rows, transaction) {
  const groups=new Map();
  const seen=new Set(rows.map(row=>`${model.name}:${recordKey(primaryKey(model,row))}`));
  async function visit(parent, parents) {
    const table=parent.getTableName();
    for(const child of Object.values(sequelize.models).filter(model=>!model.name.startsWith('Activity'))) {
      for(const [field,definition] of Object.entries(child.rawAttributes)) {
        const reference=definition.references;
        if(!reference || !['CASCADE','SET NULL'].includes(definition.onDelete))continue;
        const referencedTable=typeof reference.model==='string'?reference.model:reference.model.tableName;
        if(referencedTable!==table)continue;
        const parentField=Object.keys(parent.rawAttributes).find(key=>(parent.rawAttributes[key].field||key)===reference.key);
        const ids=[...new Set(parents.map(row=>row[parentField]).filter(value=>value!==null&&value!==undefined))];
        if(!ids.length)continue;
        const related=(await read(child,{[field]:{[Op.in]:ids}},transaction)).filter(row=>{
          const key=`${child.name}:${recordKey(primaryKey(child,row))}`;
          if(seen.has(key))return false;seen.add(key);return true;
        });
        if(!related.length)continue;
        const group=groups.get(child.name)||{model:child,rows:[]};group.rows.push(...related);groups.set(child.name,group);
        if(definition.onDelete==='CASCADE')await visit(child,related);
      }
    }
  }
  await visit(model,rows);return [...groups.values()];
}
async function recordDependents(groups,transaction) {
  for(const group of groups)await record(group.model,group.rows,await read(group.model,keyWhere(group.model,group.rows),transaction),transaction);
}
function upsertWhere(model, values) {
  const physical = field => Object.keys(model.rawAttributes).find(key => model.rawAttributes[key].field === field) || field;
  const keys = [model.primaryKeyAttributes, ...Object.values(model.uniqueKeys).map(key => key.fields.map(physical)),
    ...model.options.indexes.filter(index => index.unique).map(index => index.fields.map(field => physical(typeof field === 'string' ? field : field.name)))];
  const candidates = keys.filter(keys => keys.length && keys.every(key => values[key] !== undefined && values[key] !== null));
  return candidates.length ? {[Op.or]: candidates.map(keys => Object.fromEntries(keys.map(key => [key, values[key]])))} : null;
}
async function record(model, before, after, transaction) {
  const context = getActivityContext();
  const oldRows = new Map(before.map(row => [recordKey(primaryKey(model, row)), snapshot(model, row)]));
  const newRows = new Map(after.map(row => [recordKey(primaryKey(model, row)), snapshot(model, row)]));
  const changes = [];
  for (const key of new Set([...oldRows.keys(), ...newRows.keys()])) {
    const old = oldRows.get(key) || null;
    const current = newRows.get(key) || null;
    const fields = changedFields(old, current);
    if (!fields.some(field => !['createdAt','updatedAt'].includes(field))) continue;
    const row = current || old;
    if(context)context.search ||= new Set();
    for (const field of ['name','userName','roll_number','student_id','room_number','description','file_name']) {
      if (context && row[field] !== undefined) context.search.add(String(row[field]).slice(0, 200));
    }
    changes.push({ operation_id:context?.id, model_name:model.name, record_key:key,
      primary_key:primaryKey(model,row), action:!old ? 'create' : !current ? 'delete' : 'update',
      hostel_id:row.hostel_id || null, before_values:old, after_values:current, changed_fields:fields });
  }
  const studentIds=[...new Set(changes.flatMap(change=>[change.after_values?.student_id,change.before_values?.student_id,change.after_values?.user_id]).filter(Boolean))];
  if(context && studentIds.length) {
    const students=await sequelize.models.User.findAll({where:{userId:{[Op.in]:studentIds}},attributes:['userName','roll_number'],transaction,raw:true});
    for(const student of students)for(const value of [student.userName,student.roll_number])if(value)context.search.add(String(value));
  }
  if (context && changes.length) await ActivityChange.bulkCreate(changes, {transaction});
  await publishModelNotifications(model,changes,transaction);
}

// Intercept model writes, not HTTP verbs: a report can also change business data.
// Nested model calls are suppressed; each mutation and its snapshots share a transaction.
export function installActivityRecorder(models) {
  for (const model of Object.values(models)) {
    if (!model?.rawAttributes || model.name.startsWith('Activity') || model.name==='InAppNotification' || installed.has(model)) continue;
    installed.add(model);
    for (const [name, optionIndex] of Object.entries({create:1, bulkCreate:1, update:1, destroy:0, upsert:1, increment:1, decrement:1})) {
      const original = model[name];
      model[name] = async function(...args) {
        const context = getActivityContext();
        if ((!context && !getNotificationContext()) || mutationContext.getStore()) return original.apply(this,args);
        if(context)await ensureActivity(context);
        const options = {...args[optionIndex]};
        if(options.truncate)throw new Error('Truncation is not supported in an audited request.');
        const execute = async transaction => mutationContext.run(true, async () => {
          options.transaction = transaction;
          args[optionIndex] = options;
          let before = [];
          const uniqueWhere = name === 'upsert' ? upsertWhere(model,args[0]) : null;
          const bulkKeys = name === 'bulkCreate' && (options.updateOnDuplicate || options.ignoreDuplicates)
            ? args[0].map(value=>upsertWhere(model,value)).filter(Boolean) : [];
          const bulkWhere = bulkKeys.length ? {[Op.or]:bulkKeys} : null;
          if(bulkWhere)before=await read(model,bulkWhere,transaction);
          if (!['create','bulkCreate'].includes(name) && (name !== 'upsert' || uniqueWhere)) {
            before = await read(model,uniqueWhere || options.where,transaction,options.limit);
          }
          const dependents=name==='destroy'?await dependentSnapshots(model,before,transaction):[];
          const result = await original.apply(this,args);
          let after = [];
          if (name !== 'destroy') {
            if(name==='bulkCreate') {
              const created=result.map(row=>row.get({plain:true})).filter(row=>model.primaryKeyAttributes.every(key=>row[key]!==null&&row[key]!==undefined));
              const lookups=[bulkWhere,created.length?keyWhere(model,created):null].filter(Boolean);
              if(lookups.length)after=await read(model,{[Op.or]:lookups},transaction);
              if(args[0].length && !after.length)throw new Error('Unable to verify the saved bulk activity records.');
            }
            else if (before.length) after = await read(model,keyWhere(model,before),transaction);
            else if (name === 'upsert' && uniqueWhere) after = await read(model,uniqueWhere,transaction);
            else if (['create','bulkCreate','upsert'].includes(name)) {
              const created = name === 'bulkCreate' ? result : [name === 'upsert' ? result[0] : result];
              const rows = created.map(row => row.get({plain:true})).filter(row => model.primaryKeyAttributes.every(key => row[key] !== undefined && row[key] !== null));
              if (rows.length) after = await read(model,keyWhere(model,rows),transaction);
              if (!after.length && rows.length) throw new Error('Unable to verify the saved activity records.');
            }
          }
          await record(model,before,after,transaction);
          await recordDependents(dependents,transaction);
          return result;
        });
        return options.transaction ? execute(options.transaction) : sequelize.transaction(execute);
      };
    }
    for (const [name, optionIndex] of Object.entries({save:0, update:1, destroy:0, increment:1, decrement:1})) {
      const original = model.prototype[name];
      model.prototype[name] = async function(...args) {
        const context = getActivityContext();
        if ((!context && !getNotificationContext()) || mutationContext.getStore()) return original.apply(this,args);
        if(context)await ensureActivity(context);
        const options = {...args[optionIndex]};
        const execute = async transaction => mutationContext.run(true, async () => {
          options.transaction = transaction; args[optionIndex] = options;
          const before = this.isNewRecord ? [] : await read(model,primaryKey(model,this.get({plain:true})),transaction);
          const dependents=name==='destroy'?await dependentSnapshots(model,before,transaction):[];
          const result = await original.apply(this,args);
          const after = name === 'destroy' ? [] : await read(model,primaryKey(model,this.get({plain:true})),transaction);
          await record(model,before,after,transaction);
          await recordDependents(dependents,transaction);
          return result;
        });
        return options.transaction ? execute(options.transaction) : sequelize.transaction(execute);
      };
    }
  }
}
