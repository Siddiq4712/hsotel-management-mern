import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import nodemailer from 'nodemailer';
import { Op, Transaction } from 'sequelize';
import * as models from '../models/index.js';
import { ActivityOperation, ActivityChange, ActivityReversal, ActivityDelivery } from '../models/activity.js';
import { activityContext, getActivityContext, withActivityRequest } from '../services/activityContext.js';
import { installActivityRecorder } from '../services/activityRecorder.js';
import { previewReversal, revertActivity, changeActivityRecord } from '../services/activityActions.js';
import { previewHash, snapshot } from '../utils/activityValues.js';
import { recordStaffRecordedSpecialFoodConsumption } from '../controllers/specialMealController.js';

const {sequelize,UOM,User,SpecialFoodItem,FoodOrder,FoodOrderItem,StudentFee,Attendance,ExpenseType,MessDailyExpense,Item,ItemCategory,ItemStock}=models;
models.initAssociations();installActivityRecorder(models);
const originalTransaction=sequelize.transaction.bind(sequelize);
const contexts=[];
let outer;
const context=(role='admin')=>{const value={id:crypto.randomUUID(),actorId:1,actorName:'Activity rollback verification',actorRole:role,workspace:role==='admin'?'mess':role,module:'verification',method:'POST',path:'/verification/activity'};contexts.push(value);return value;};
async function run(fn,role='admin') {
  const ctx=context(role);const value=await activityContext.run(ctx,()=>fn(ctx));
  if(ctx.operationPromise){await ctx.operationPromise;await ActivityOperation.update({status:'completed',change_count:await ActivityChange.count({where:{operation_id:ctx.id},transaction:outer})},{where:{id:ctx.id}});}
  return {ctx,value};
}
const rows=async id=>ActivityChange.findAll({where:{operation_id:id},transaction:outer,raw:true,order:[['id','ASC']]});
try {
  const counted=[UOM,FoodOrder,FoodOrderItem,StudentFee,Attendance,MessDailyExpense,ItemStock,ActivityChange,ActivityReversal,models.DailyMessCharge];
  const before=await Promise.all(counted.map(model=>model.count()));
  outer=await originalTransaction({isolationLevel:Transaction.ISOLATION_LEVELS.READ_COMMITTED});
  sequelize.transaction=(options,callback)=>typeof options==='function'?originalTransaction({transaction:outer},options):originalTransaction({...options,transaction:options?.transaction||outer},callback);
  const created=await run(()=>UOM.create({name:'Audit original',abbreviation:'audit',type:'weight'},{transaction:outer}));
  assert.equal((await rows(created.ctx.id)).length,1);
  const edited=await run(()=>created.value.update({name:'Audit changed'},{transaction:outer}),'warden');
  assert.equal((await rows(edited.ctx.id))[0].before_values.name,'Audit original');
  assert.equal((await rows(edited.ctx.id))[0].after_values.name,'Audit changed');
  assert.equal((await previewReversal(created.ctx.id,outer)).allowed,false);
  const preview=await previewReversal(edited.ctx.id,outer);assert.equal(preview.allowed,true,preview.blockers.join(' '));
  await run(()=>revertActivity(edited.ctx.id,'Verify update reversal',preview.token));
  assert.equal((await UOM.findByPk(created.value.id,{transaction:outer})).name,'Audit original');
  assert.equal((await previewReversal(edited.ctx.id,outer)).allowed,false);

  const simple=await run(()=>UOM.create({name:'Audit remove',abbreviation:'remove',type:'weight'},{transaction:outer}));
  const simplePreview=await previewReversal(simple.ctx.id,outer);assert(simplePreview.allowed,simplePreview.blockers.join(' '));
  await run(()=>revertActivity(simple.ctx.id,'Verify create reversal',simplePreview.token));
  assert.equal(await UOM.findByPk(simple.value.id,{transaction:outer}),null);

  const changed=await run(()=>UOM.update({name:'Audit bulk update'},{where:{id:created.value.id},transaction:outer}));
  assert.equal((await rows(changed.ctx.id)).length,1);
  const upsert=await run(()=>UOM.upsert({id:created.value.id,name:'Audit upsert',abbreviation:'audit',type:'weight'},{transaction:outer}));
  assert.equal((await rows(upsert.ctx.id))[0].action,'update');
  const correctionRow=(await rows(upsert.ctx.id))[0];
  const current=await UOM.findByPk(created.value.id,{transaction:outer});
  await run(()=>changeActivityRecord(upsert.ctx.id,correctionRow.id,{reason:'Verify a catalog correction',token:previewHash(snapshot(UOM,current)),values:{name:'Audit corrected'}},'correct'));
  assert.equal((await UOM.findByPk(created.value.id,{transaction:outer})).name,'Audit corrected');

  const students=await User.findAll({where:{hostel_id:2,roll_number:{[Op.in]:['2310001','2310002']}},transaction:outer});assert.equal(students.length,2);
  const chargeValues=students.map(student=>({student_id:student.userId,hostel_id:2,date:'2029-04-06',amount:10,attendance_status:'present',is_charged:true}));
  await run(()=>models.DailyMessCharge.bulkCreate(chargeValues,{updateOnDuplicate:['amount'],transaction:outer}));
  const chargeUpdate=await run(()=>models.DailyMessCharge.bulkCreate(chargeValues.map(row=>({...row,amount:20})),{updateOnDuplicate:['amount'],transaction:outer}));
  const chargeChanges=await rows(chargeUpdate.ctx.id);assert.equal(chargeChanges.length,2);
  assert(chargeChanges.every(row=>row.action==='update'&&Number(row.before_values.amount)===10&&Number(row.after_values.amount)===20));
  const bulk=await run(()=>Attendance.bulkCreate(students.map(student=>({student_id:student.userId,hostel_id:2,date:'2029-04-01',status:'P',is_monthly:true,totalManDays:20,marked_by:1})),{transaction:outer}));
  assert.equal((await rows(bulk.ctx.id)).length,2);
  const bulkPreview=await previewReversal(bulk.ctx.id,outer);assert(bulkPreview.allowed,bulkPreview.blockers.join(' '));
  await run(()=>revertActivity(bulk.ctx.id,'Verify entire attendance batch',bulkPreview.token));
  assert.equal(await Attendance.count({where:{date:'2029-04-01'},transaction:outer}),0);

  const food=await SpecialFoodItem.create({name:'Audit test dish',category:'test',price:25,is_available:true},{transaction:outer});
  const meal=await run(async()=>{
    const res={statusCode:200,status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}};
    await recordStaffRecordedSpecialFoodConsumption({user:{userId:1,role:'admin'},body:{hostel_id:2,student_ids:students.map(s=>s.userId),consumption_date:'2029-04-05',items:[{food_item_id:food.id,quantity:2}]}},res);
    assert.equal(res.statusCode,201,JSON.stringify(res.body));
  });
  assert.equal((await rows(meal.ctx.id)).length,6);
  const mealPreview=await previewReversal(meal.ctx.id,outer);assert(mealPreview.allowed,mealPreview.blockers.join(' '));
  const writeChanges=ActivityChange.bulkCreate;let reversalWrites=0;
  ActivityChange.bulkCreate=async function(...args){if(++reversalWrites===2)throw new Error('Intentional partial reversal failure');return writeChanges.apply(this,args);};
  try {await assert.rejects(()=>run(()=>revertActivity(meal.ctx.id,'Verify reversal rolls back in full',mealPreview.token)),/Intentional partial/);}
  finally{ActivityChange.bulkCreate=writeChanges;}
  assert.equal(await ActivityReversal.findByPk(meal.ctx.id,{transaction:outer}),null);
  assert.equal(await FoodOrder.count({transaction:outer}),before[1]+2);
  assert.equal(await StudentFee.count({transaction:outer}),before[3]+2);
  assert((await previewReversal(meal.ctx.id,outer)).allowed);
  await run(()=>revertActivity(meal.ctx.id,'Verify meal charges reverse together',mealPreview.token));
  assert.equal(await StudentFee.count({transaction:outer}),before[3]);
  assert.equal(await FoodOrder.count({transaction:outer}),before[1]);

  const category=await ItemCategory.create({name:'Audit category'},{transaction:outer});
  const item=await Item.create({name:'Audit stock',category_id:category.id,unit_id:created.value.id},{transaction:outer});
  const stock=await ItemStock.create({item_id:item.id,hostel_id:2,current_stock:10},{transaction:outer});
  const increment=await run(()=>stock.increment('current_stock',{by:5,transaction:outer}),'mess');
  assert.equal(Number((await rows(increment.ctx.id))[0].after_values.current_stock),15);
  const incrementPreview=await previewReversal(increment.ctx.id,outer);assert(incrementPreview.allowed,incrementPreview.blockers.join(' '));
  await run(()=>revertActivity(increment.ctx.id,'Verify stock balance reversal',incrementPreview.token));
  assert.equal(Number((await ItemStock.findByPk(stock.id,{transaction:outer})).current_stock),10);

  const recipe=await models.Recipe.create({hostel_id:2,name:'Audit recipe'},{transaction:outer});
  const recipeItem=await models.RecipeItem.create({recipe_id:recipe.id,item_id:item.id,unit_id:created.value.id,quantity_per_serving:1},{transaction:outer});
  const removed=await run(()=>recipe.destroy({transaction:outer}));
  assert.deepEqual((await rows(removed.ctx.id)).map(row=>row.model_name).sort(),['Recipe','RecipeItem']);
  const removedPreview=await previewReversal(removed.ctx.id,outer);assert(removedPreview.allowed,removedPreview.blockers.join(' '));
  await run(()=>revertActivity(removed.ctx.id,'Verify cascading delete restoration',removedPreview.token));
  assert(await models.Recipe.findByPk(recipe.id,{transaction:outer}));assert(await models.RecipeItem.findByPk(recipeItem.id,{transaction:outer}));

  const type=await ExpenseType.findOne({transaction:outer});
  const protectedExpense=await run(()=>MessDailyExpense.create({hostel_id:2,expense_type_id:type.id,amount:1,expense_date:'2026-08-05',recorded_by:1},{transaction:outer}));
  assert((await previewReversal(protectedExpense.ctx.id,outer)).blockers.some(value=>value.includes('protected')));
  const paid=await run(()=>StudentFee.create({student_id:students[0].userId,hostel_id:2,fee_type:'test',amount:1,month:4,year:2029,status:'paid',issued_by:1},{transaction:outer}));
  assert((await previewReversal(paid.ctx.id,outer)).blockers.some(value=>value.includes('Paid')));

  const dependentUom=await run(()=>UOM.create({name:'Audit referenced unit',abbreviation:'reference',type:'weight'},{transaction:outer}));
  await Item.create({name:'Audit dependent item',category_id:category.id,unit_id:dependentUom.value.id},{transaction:outer});
  assert((await previewReversal(dependentUom.ctx.id,outer)).blockers.some(value=>value.includes('referenced')));

  const requestRes=new EventEmitter();requestRes.statusCode=200;
  let requestContext;
  await withActivityRequest({user:{userId:1,userName:'Activity request verification',role:'admin'},get:()=> 'warden',method:'POST',originalUrl:'/api/warden/holidays'},requestRes,async()=>{
    requestContext=getActivityContext();contexts.push(requestContext);
    await UOM.create({name:'Audit request middleware',abbreviation:'request',type:'weight'},{transaction:outer});
  });
  await Promise.all(requestRes.listeners('finish').map(listener=>listener()));
  const requestOperation=await ActivityOperation.findByPk(requestContext.id);
  assert.equal(requestOperation.actor_role,'admin');assert.equal(requestOperation.workspace,'warden');
  assert.equal(requestOperation.status,'completed');assert(requestOperation.search_text.includes('Audit request middleware'));

  const originalTransport=nodemailer.createTransport;
  let simulatedDeliveries=0;
  nodemailer.createTransport=()=>({sendMail:async()=>{simulatedDeliveries++;return {messageId:'simulated'};}});
  try {
    const {sendEmail}=await import('../utils/emailUtils.js');
    const delivered=await run(()=>sendEmail({to:'verification@example.invalid',subject:'Simulated audit delivery',text:'No real email'}));
    assert.equal(delivered.value.success,true);assert.equal(simulatedDeliveries,1);
    const notification=await ActivityDelivery.findOne({where:{operation_id:delivered.ctx.id}});
    assert.equal(notification.status,'sent');
    assert((await previewReversal(delivered.ctx.id,outer)).blockers.some(value=>value.includes('notification')));
  }finally{nodemailer.createTransport=originalTransport;}

  // A log insert failure must roll back the associated business write too.
  const logInsert=ActivityChange.bulkCreate;
  ActivityChange.bulkCreate=async()=>{throw new Error('Intentional audit write failure');};
  try {await assert.rejects(()=>run(()=>UOM.create({name:'Must roll back',abbreviation:'fail',type:'weight'})),/Intentional/);}
  finally{ActivityChange.bulkCreate=logInsert;}
  assert.equal(await UOM.count({where:{name:'Must roll back'},transaction:outer}),0);
  await outer.rollback();outer=null;
  const after=await Promise.all(counted.map(model=>model.count()));assert.deepEqual(after,before);
  console.log('PASS: create/update/bulk/upsert/increment/cascade capture; atomic audit and reversal failures; correction; attendance, meal and stock reversals; dependency, paid-fee and protected-August guards. All business and change rows rolled back.');
}finally{
  sequelize.transaction=originalTransaction;
  if(outer)await outer.rollback();
  const ids=contexts.map(ctx=>ctx.id);
  await ActivityOperation.destroy({where:{id:{[Op.in]:ids}}});
  await ActivityDelivery.destroy({where:{operation_id:{[Op.in]:ids}}});
  await sequelize.close();
}
