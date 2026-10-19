import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, consolidateChanges, previewHash, sameValues } from '../utils/activityValues.js';
import { modelPolicy, requireReason } from '../services/activityActions.js';

test('snapshots exclude credentials, virtual fields and associations',()=>{
  const model={rawAttributes:{id:{},name:{},password:{},qr_token:{},resetOTP:{},metadata:{},display:{type:{key:'VIRTUAL'}}}};
  assert.deepEqual(snapshot(model,{id:1,name:'Student',password:'private',qr_token:'private',resetOTP:'private',metadata:{name:'Kept',nested:{secret:'private'}},display:'virtual',role:{}}),{id:1,name:'Student',metadata:{name:'Kept',nested:{}}});
});
test('bulk history consolidates the earliest before and latest after per record',()=>{
  const change=(id,before,after)=>({id,model_name:'UOM',record_key:'{"id":1}',before_values:before,after_values:after});
  const rows=consolidateChanges([change(1,{name:'Old'},{name:'Middle'}),change(2,{name:'Middle'},{name:'New'})]);
  assert.deepEqual(rows[0].before_values,{name:'Old'});assert.deepEqual(rows[0].after_values,{name:'New'});
  assert.equal(consolidateChanges([change(1,null,{name:'New'}),change(2,{name:'New'},null)]).length,0);
});
test('preview fingerprints are stable and change when a record changes',()=>{
  assert.equal(previewHash({b:2,a:1}),previewHash({a:1,b:2}));
  assert.notEqual(previewHash({a:1}),previewHash({a:2}));
  assert(sameValues({a:null},{a:null}));assert(!sameValues(null,{}));
});
test('reversal policies block credentials, finalized bills and settled fees',()=>{
  assert.match(modelPolicy({model_name:'User'}),/dedicated/);
  assert.match(modelPolicy({model_name:'MessBill'}),/dedicated/);
  assert.match(modelPolicy({model_name:'StudentFee',after_values:{status:'paid'}}),/adjustment/);
  assert.match(modelPolicy({model_name:'Enrollment',before_values:{student_id:1},after_values:{student_id:2}}),/Admission/);
  assert.equal(modelPolicy({model_name:'Attendance'}),null);
  assert.throws(()=>requireReason(''),/reason/);assert.equal(requireReason(' Correct entry '),'Correct entry');
});
