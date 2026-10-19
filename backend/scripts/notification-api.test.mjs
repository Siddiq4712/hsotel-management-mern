import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { InAppNotification } from '../models/index.js';
import { listNotifications, readNotification, readAllNotifications } from '../controllers/notificationController.js';

const response=()=>({code:200,status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
test('every authenticated role lists only its own notifications and counts',async()=>{
  const originals={list:InAppNotification.findAndCountAll,count:InAppNotification.count,max:InAppNotification.max};
  try {
    for(const role of ['admin','warden','mess','student','lapc','parent','security']) {
      const checks=[];
      InAppNotification.findAndCountAll=async options=>{checks.push(options.where);return {rows:[],count:0};};
      InAppNotification.count=async options=>{checks.push(options.where);return 0;};
      InAppNotification.max=async(field,options)=>{checks.push(options.where);return null;};
      const res=response();await listNotifications({user:{userId:12,role},query:{user_id:99,status:'unread',pageSize:999}},res);
      assert.equal(res.code,200);assert.equal(res.body.unreadCount,0);assert.equal(res.body.pageSize,50);
      assert(checks.every(where=>where.user_id===12));
    }
  }finally{InAppNotification.findAndCountAll=originals.list;InAppNotification.count=originals.count;InAppNotification.max=originals.max;}
});
test('reading another user notification returns not found without updating it',async()=>{
  const original=InAppNotification.findOne;
  try {
    InAppNotification.findOne=async({where})=>{assert.deepEqual(where,{id:6,user_id:12});return null;};
    const res=response();await readNotification({user:{userId:12},params:{id:6},body:{user_id:99}},res);
    assert.equal(res.code,404);
  }finally{InAppNotification.findOne=original;}
});
test('mark-all respects owner and the displayed cutoff so newer alerts stay unread',async()=>{
  const original=InAppNotification.update;
  try {
    InAppNotification.update=async(values,{where})=>{assert.deepEqual(values,{status:'read'});assert.equal(where.user_id,12);assert.equal(where.status,'unread');assert.equal(where.id[Op.lte],40);return [3];};
    const res=response();await readAllNotifications({user:{userId:12},body:{throughId:40,user_id:99}},res);
    assert.equal(res.body.updated,3);
    const invalid=response();await readAllNotifications({user:{userId:12},body:{throughId:-1}},invalid);assert.equal(invalid.code,400);
  }finally{InAppNotification.update=original;}
});
