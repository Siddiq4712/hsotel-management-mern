import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSpecialMeal} from '../utils/specialMealValidation.js';

const dish={food_item_id:1,quantity:2};
test('accepts a group and preserves legacy single student input',()=>{
  assert.deepEqual(normalizeSpecialMeal({student_ids:[8,9],items:[dish]}),{studentIds:[8,9],items:[dish]});
  assert.deepEqual(normalizeSpecialMeal({student_id:8,items:[dish]}).studentIds,[8]);
});
test('rejects empty and duplicate students and invalid quantities',()=>{
  for(const student_ids of [[],[8,8],[0],[-1],Array(1001).fill(8)])assert.throws(()=>normalizeSpecialMeal({student_ids,items:[dish]}));
  for(const quantity of [0,-1,1.5,Infinity,'invalid',1001])assert.throws(()=>normalizeSpecialMeal({student_ids:[8],items:[{...dish,quantity}]}));
});
test('combines repeated dishes and ignores submitted prices',()=>{
  const result=normalizeSpecialMeal({student_ids:[8],items:[{...dish,unit_price:0},dish]});
  assert.deepEqual(result.items,[{food_item_id:1,quantity:4}]);
});
