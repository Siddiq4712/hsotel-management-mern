import test from 'node:test';
import assert from 'node:assert/strict';
import { installAdminWorkspace, mergeWorkspaceValues } from '../middleware/adminWorkspace.js';
import { canAccessRole } from '../utils/workspacePermissions.js';
import { Hostel, User } from '../models/index.js';

test('Admin inherits staff access without granting staff Admin access', () => {
  assert.equal(canAccessRole('admin',['warden']),true);
  assert.equal(canAccessRole('admin',['mess']),true);
  assert.equal(canAccessRole('warden',['admin']),false);
  assert.equal(canAccessRole('admin',['security']),false);
  assert.equal(canAccessRole('student',['warden']),false);
});
test('combined reports preserve every student bill and sum totals', () => {
  const result=mergeWorkspaceValues([
    {data:[{studentId:1,dailyRate:80,finalAmount:800}],summary:{grandTotal:800,daysInMonth:31}},
    {data:[{studentId:2,dailyRate:100,finalAmount:1000}],summary:{grandTotal:1000,daysInMonth:31}}
  ]);
  assert.deepEqual(result.data.map(row=>row.dailyRate),[80,100]);
  assert.equal(result.summary.grandTotal,1800);
  assert.equal(result.summary.daysInMonth,31);
  assert.equal(mergeWorkspaceValues([{totalAmount:'10.50'},{totalAmount:'20.25'}]).totalAmount,'30.75');
  const chart=mergeWorkspaceValues([{labels:['Rice'],datasets:[{data:[10]}]},{labels:['Rice','Milk'],datasets:[{data:[20,5]}]}]);
  assert.deepEqual(chart.datasets[0].data,[30,5]);
});
test('Admin scope is inferred or requested before writing; ordinary staff scope stays intact', async () => {
  const original={all:Hostel.findAll,hostel:Hostel.findByPk,user:User.findByPk};
  const hostels=[{id:1,name:'A'},{id:2,name:'B'}];
  Hostel.findAll=async()=>hostels;
  Hostel.findByPk=async id=>hostels.find(h=>h.id===id);
  User.findByPk=async()=>({get:key=>key==='hostel_id'?2:null});
  try {
    const routes={};
    const router=Object.fromEntries(['get','post','put','patch','delete'].map(method=>[method,(path,...handlers)=>{routes[`${method} ${path}`]=handlers.at(-1);} ]));
    installAdminWorkspace(router,'warden');
    let writes=0,actor;
    // Student enrollment has its own batch routing; holidays exercise the generic entry gate.
    router.post('/holidays',async(req,res)=>{writes++;actor=req.user;res.json({success:true});});
    router.post('/attendance',async(req,res)=>{writes++;actor=req.user;res.json({success:true});});
    router.get('/students',async(req,res)=>res.json({success:true,data:[{id:req.user.hostel_id}]}));
    const request=(extra={})=>({user:{role:'admin',userId:1,hostel_id:null},body:{},query:{},params:{},get:()=>undefined,...extra});
    const response=()=>({statusCode:200,status(value){this.statusCode=value;return this;},json(value){this.body=value;return this;}});
    const res=response();await routes['post /holidays'](request(),res);
    assert.equal(res.statusCode,409);assert.equal(res.body.code,'HOSTEL_REQUIRED');assert.equal(writes,0);
    await routes['post /holidays'](request({get:()=> '1'}),response());
    assert.deepEqual(actor,{role:'admin',userId:1,hostel_id:1,hostelId:1});
    await routes['post /attendance'](request({body:{student_id:20}}),response());
    assert.equal(actor.hostel_id,2);
    const before=writes;
    const conflict=response();await routes['post /attendance'](request({body:{student_id:20},get:()=> '1'}),conflict);
    assert.equal(conflict.statusCode,400);assert.equal(writes,before);
    const list=response();await routes['get /students'](request(),list);
    assert.deepEqual(list.body.data.map(row=>row.hostel_id),[1,2]);
    await routes['post /holidays'](request({user:{role:'warden',userId:7,hostel_id:2}}),response());
    assert.deepEqual(actor,{role:'warden',userId:7,hostel_id:2});
  } finally {Hostel.findAll=original.all;Hostel.findByPk=original.hostel;User.findByPk=original.user;}
});
