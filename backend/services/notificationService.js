import crypto from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { NotificationDispatch } from '../models/notifications.js';
import { getNotificationContext } from './notificationContext.js';
import { getActivityContext } from './activityContext.js';

const supported=new Set(['Leave','Complaint','RoomRequest','DayReductionRequest','Rebate','Outpass','Suspension',
  'Attendance','GPSAttendance','MonthlyAttendanceImport','RoomAllotment','StudentFee','MessBill','FoodOrder','ItemStock','PurchaseOrder','HostelNotice','User']);
const roleName=name=>({administrator:'admin',messstaff:'mess'}[String(name).toLowerCase().replace(/\s/g,'')]||String(name).toLowerCase().replace(/\s/g,''));
const statusText=value=>value==='pending_admin'?'pending review':String(value||'updated').replace(/_/g,' ');
const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const date=value=>String(value||'').slice(0,10);

// Each notification and its deduplication receipt share the business transaction.
export async function deliverNotifications(messages,transaction) {
  if(!messages.length)return;
  const {User,InAppNotification}=sequelize.models;
  const unique=new Map(messages.map(message=>[`${message.eventKey}:${message.userId}`,message]));
  const active=await User.findAll({where:{userId:{[Op.in]:[...new Set(messages.map(message=>message.userId))]},status:true},attributes:['userId'],transaction,raw:true});
  const activeIds=new Set(active.map(user=>user.userId));
  const entries=[...unique.values()].filter(message=>activeIds.has(message.userId)).map(message=>({...message,
    key:crypto.createHash('sha256').update(message.eventKey).digest('hex')}));
  if(!entries.length)return;
  const existing=await NotificationDispatch.findAll({where:{[Op.or]:entries.map(message=>({event_key:message.key,user_id:message.userId}))},attributes:['event_key','user_id'],transaction,raw:true});
  const sent=new Set(existing.map(row=>`${row.event_key}:${row.user_id}`));
  const pending=entries.filter(message=>!sent.has(`${message.key}:${message.userId}`));
  if(!pending.length)return;
  const notifications=await InAppNotification.bulkCreate(pending.map(message=>({user_id:message.userId,title:message.title,
    message:message.message,type:message.type,status:'unread'})),{transaction});
  await NotificationDispatch.bulkCreate(pending.map((message,index)=>({user_id:message.userId,event_key:message.key,notification_id:notifications[index].id})),{transaction});
}

export async function publishModelNotifications(model,changes,transaction) {
  const context=getNotificationContext();
  if(!context || !supported.has(model.name) || !changes.length)return;
  const {User,Role,ParentStudent,Item,HostelRoom}=sequelize.models;
  context.notificationCache ||= {students:new Map(),staff:new Map()};
  const cache=context.notificationCache;
  const student=async id=>{
    if(!id)return null;
    if(!cache.students.has(id))cache.students.set(id,(async()=>{
      const [user,parents]=await Promise.all([User.findByPk(id,{attributes:['userId','userName','roll_number','hostel_id'],transaction}),
        ParentStudent.findAll({where:{student_id:id},attributes:['parent_id'],transaction,raw:true})]);
      return user?{...user.get({plain:true}),parentIds:parents.map(row=>row.parent_id)}:null;
    })());
    return cache.students.get(id);
  };
  const staff=async(hostel,roles)=>{
    const key=`${hostel}:${roles.join(',')}`;
    if(!cache.staff.has(key))cache.staff.set(key,(async()=>{
      const roleRows=await Role.findAll({attributes:['roleId','roleName'],transaction,raw:true});
      const selected=roleRows.filter(row=>roles.includes(roleName(row.roleName)));
      const users=await User.findAll({where:{roleId:{[Op.in]:selected.map(row=>row.roleId)},status:true},attributes:['userId','roleId','hostel_id'],transaction,raw:true});
      const names=new Map(selected.map(row=>[row.roleId,roleName(row.roleName)]));
      return users.filter(user=>names.get(user.roleId)==='admin'||Number(user.hostel_id)===Number(hostel)||(names.get(user.roleId)==='security'&&!user.hostel_id)).map(user=>user.userId);
    })());
    return cache.staff.get(key);
  };
  const messages=[];
  const isReversal=getActivityContext()?.kind==='revert';
  const isCorrection=getActivityContext()?.kind==='correct';
  const add=(ids,key,title,message,type)=>{
    for(const userId of new Set(ids.filter(Boolean)))messages.push({userId,eventKey:`${context.id}:${model.name}:${key}`,
      title:isReversal?`${title} · Reversal`:isCorrection?`${title} · Correction`:title,message,type});
  };
  for(const change of changes) {
    const row=change.after_values||change.before_values;
    const old=change.before_values;
    const removed=!change.after_values;
    const key=`${change.record_key}:${change.action}:${row.status||''}:${row.payment_status||''}`;
    const person=await student(row.student_id || (['Attendance','GPSAttendance'].includes(model.name)?row.user_id:null));
    const hostel=row.hostel_id || person?.hostel_id;
    const own=person?[person.userId,...person.parentIds]:[];
    const personLabel=person?`${person.userName}${person.roll_number?` (${person.roll_number})`:''}`:'A student';
    if(model.name==='User') {
      if(!old&&!removed)add([row.userId],key,'Welcome to Hostel Management','Your notification inbox is active. Updates relevant to your account will appear here.','welcome');
    }else if(['Leave','Complaint','RoomRequest','DayReductionRequest','Rebate'].includes(model.name)) {
      const topic={Leave:'Leave request',Complaint:'Complaint',RoomRequest:'Room request',DayReductionRequest:'Day reduction request',Rebate:'Rebate request'}[model.name];
      const type={Leave:'leave',Complaint:'complaint',RoomRequest:'room',DayReductionRequest:'day_reduction',Rebate:'rebate'}[model.name];
      const state=removed?'removed':!old?'submitted':statusText(row.status);
      add(own,key,`${topic} ${state}`,`${personLabel}: ${topic.toLowerCase()} #${row.id} has been ${state}.`,type);
      if(!old || removed || row.status!==old.status) {
        let roles=['admin','warden'];
        if(model.name==='DayReductionRequest'&&row.status==='pending_admin')roles=['admin','warden'];
        add(await staff(hostel,roles),key,`${topic} ${state}`,`${personLabel}: ${topic.toLowerCase()} #${row.id} is ${state}.`,type);
      }
    }else if(model.name==='Outpass') {
      const states={pending:'submitted',approved:'approved',rejected:'rejected',outside:'exit recorded',completed:'return recorded',late_return:'late return recorded',cancelled:'cancelled'};
      if(old && row.status===old.status && !removed)continue;
      const state=removed?'removed':states[row.status]||statusText(row.status);
      add(own,key,`Outpass ${state}`,`${personLabel}: outpass #${row.id} for ${row.destination||'the requested destination'} — ${state}.`,'outpass');
      const roles=!old?['admin','warden']:['approved','cancelled'].includes(row.status)?['warden','security']:[];
      if(roles.length)add(await staff(hostel,roles),key,`Outpass ${state}`,`${personLabel}: outpass #${row.id} — ${state}.`,'outpass');
    }else if(model.name==='Suspension') {
      add(own,key,removed?'Suspension removed':'Suspension updated',`${personLabel}: suspension #${row.id} is ${removed?'removed':statusText(row.status)}. Check with the Warden for details.`,'suspension');
    }else if(['Attendance','GPSAttendance'].includes(model.name)) {
      if(old && !removed && !change.changed_fields.some(field=>['status','totalManDays','is_monthly','date'].includes(field)))continue;
      const text=removed?'The attendance entry was removed.':row.is_monthly?`Monthly mess attendance: ${row.totalManDays||0} days for ${date(row.date).slice(0,7)}.`:`Attendance on ${date(row.date||row.attendance_date)}${row.session?` (${statusText(row.session).toLowerCase()})`:''}: ${{P:'Present',A:'Absent',OD:'On duty'}[row.status]||row.status}.`;
      add(own,key,'Attendance updated',`${personLabel}: ${text}`,'attendance');
    }else if(model.name==='MonthlyAttendanceImport') {
      add(await staff(hostel,['admin','warden']),key,removed?'Attendance import reversed':'Monthly attendance imported',
        `${row.row_count} students · ${row.month}/${row.year} · ${row.total_man_days} man-days.`,'attendance');
    }else if(model.name==='RoomAllotment') {
      const room=await HostelRoom.findByPk(row.room_id,{attributes:['room_number'],transaction});
      add(own,key,'Room allotment updated',`${personLabel}: ${removed||row.is_active===false?'the room allotment was ended or removed':`room ${room?.room_number||row.room_id} has been allotted`}.`,'room');
    }else if(model.name==='StudentFee'||model.name==='MessBill') {
      const bill=model.name==='MessBill';
      if(old && !removed && !change.changed_fields.some(field=>['amount','status','month','year','fee_type'].includes(field)))continue;
      const label=bill?'Mess bill':statusText(row.fee_type||'Additional charge');
      const state=removed?'removed':row.status==='paid'?'payment recorded':!old?'added':'updated';
      add(own,key,`${label} ${state}`,`${personLabel}: ${label.toLowerCase()} for ${row.month}/${row.year}, ${money(row.amount)} — ${state}.`,'fee');
    }else if(model.name==='FoodOrder') {
      if(!old && row.status==='confirmed')continue; // Staff meal entry is announced by its linked fee.
      if(old && !removed && !change.changed_fields.some(field=>['status','payment_status','total_amount'].includes(field)))continue;
      const state=removed?'removed':statusText(row.status);
      add(own,key,'Food order updated',`${personLabel}: food order #${row.id}, ${money(row.total_amount)} — ${state}${row.payment_status==='paid'?' (paid)':''}.`,'food_order');
      if(!old||row.status==='cancelled')add(await staff(hostel,['mess']),key,'Food order update',`${personLabel}: order #${row.id} — ${state}.`,'food_order');
    }else if(model.name==='ItemStock') {
      if(removed)continue;
      const low=Number(row.current_stock)<=Number(row.minimum_stock);
      const wasLow=old && Number(old.current_stock)<=Number(old.minimum_stock);
      if(!low||wasLow)continue;
      const item=await Item.findByPk(row.item_id,{attributes:['name'],transaction});
      add(await staff(hostel,['admin','mess']),key,'Low stock alert',`${item?.name||`Item ${row.item_id}`}: stock ${row.current_stock}, minimum ${row.minimum_stock}.`,'stock');
    }else if(model.name==='PurchaseOrder') {
      if(old && !removed && old.status===row.status)continue;
      add(await staff(hostel,['admin','mess']),key,'Purchase order updated',`Purchase order #${row.id}: ${removed?'removed':statusText(row.status)} · ${money(row.total_amount)}.`,'stock');
    }else if(model.name==='HostelNotice') {
      if(removed)continue;
      let recipients;
      if(!row.hostel_id)recipients=await User.findAll({where:{status:true},attributes:['userId'],transaction,raw:true});
      else {
        recipients=await User.findAll({where:{hostel_id:row.hostel_id,status:true},attributes:['userId'],transaction,raw:true});
        const parents=await ParentStudent.findAll({where:{student_id:{[Op.in]:recipients.map(user=>user.userId)}},attributes:['parent_id'],transaction,raw:true});
        recipients.push(...parents.map(parent=>({userId:parent.parent_id})),...(await staff(row.hostel_id,['admin','warden','mess','security'])).map(userId=>({userId})));
      }
      add(recipients.map(user=>user.userId),key,row.title,row.content,'notice');
    }
  }
  await deliverNotifications(messages,transaction);
}
