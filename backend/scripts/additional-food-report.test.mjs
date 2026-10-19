import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAdditionalFoodReport } from '../utils/additionalFoodReport.js';

const item = (id, category, quantity = 1) => ({ food_item_id: id, quantity, category_snapshot: category, meal_type_snapshot: 'Lunch', food_name_snapshot: `Food ${id}` });
const order = (id, student, items, overrides = {}) => ({ id, student_id: student, order_source: 'student', status: 'pending', Student: { userName: `Student ${student}`, roll_number: `R${student}` }, FoodOrderItems: items, ...overrides });
test('partitions dietary tables, aggregates repeated selections, and sorts room numbers numerically', () => {
  const report = buildAdditionalFoodReport([order(1, 1, [item(1, 'Veg')]), order(2, 2, [item(1, 'Veg', 2), item(2, 'Non-Veg')]), order(3, 1, [item(1, 'Veg', 2)]), order(4, 3, [item(1, 'Veg')])],
    [{ student_id: 1, HostelRoom: { room_number: '10' } }, { student_id: 2, HostelRoom: { room_number: '2' } }], [], '2026-10-19');
  assert.deepEqual(report.veg.map(row => row.room_number), ['2', '10', '']);
  assert.equal(report.veg[1].quantity, 3);
  assert.equal(report.nonVeg[0].quantity, 1);
  assert.equal(report.total_students, 3);
  assert.equal(report.total_quantity, 7);
});
test('excludes cancellations, applies meal filters, and retains recorded food classification', () => {
  const report = buildAdditionalFoodReport([order(1, 1, [{ ...item(1, 'Non-Veg', 2), SpecialFoodItem: { category: 'Veg', name: 'Changed name' } }]),
    order(2, 1, [item(1, 'Veg', 10)], { status: 'cancelled' }), order(3, 1, [{ ...item(2, 'Veg'), meal_type_snapshot: 'Dinner' }])], [], [], '2026-10-19', 'Lunch');
  assert.equal(report.veg.length, 0);
  assert.equal(report.nonVeg[0].food, 'Food 1');
  assert.equal(report.nonVeg[0].quantity, 2);
});
test('reports missing legacy categories explicitly and falls back to enrollment rolls', () => {
  const report = buildAdditionalFoodReport([order(1, 1, [{ food_item_id: 4, quantity: 1, SpecialFoodItem: { name: 'Legacy food', category: 'Unspecified' } }], { order_source: null, Student: { userName: 'Name' } })], [], [{ student_id: 1, roll_number: 'ENROLLMENT-1' }], '2026-10-19');
  assert.equal(report.unclassified[0].roll_number, 'ENROLLMENT-1');
  assert.equal(report.legacy_order_count, 1);
  const classified = buildAdditionalFoodReport([order(2, 1, [{ ...item(4, 'Unspecified'), SpecialFoodItem: { name: 'Legacy food', category: 'Veg' } }])], [], [], '2026-10-19');
  assert.equal(classified.veg.length, 1, 'previously unclassified entries can use a category subsequently set by staff');
});
