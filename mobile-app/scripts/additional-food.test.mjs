import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFoodDate, additionalFoodRequest as buildRequest } from '../src/utils/additionalFood.js';
import { validateAdditionalFoodOrder } from '../../backend/utils/additionalFood.js';

const additionalFoodRequest = (...args) => buildRequest(...args, '2026-10-18T12:00:00+05:30');
const food = { max_quantity_per_student: 2, id: 7, name: 'Extra egg', weekly_day: 1, price: '12.50', is_available: true };
test('selects today or the next weekly day including Sunday rollover', () => {
  assert.equal(nextFoodDate(1, '2026-10-18'), '2026-10-19');
  assert.equal(nextFoodDate(0, '2026-10-18'), '2026-10-18');
  assert.equal(nextFoodDate(0, '2026-10-19'), '2026-10-25');
  assert.equal(nextFoodDate(null, '2026-10-18'), '2026-10-18');
});
test('produces a single-date mobile request accepted by backend scheduling validation', () => {
  const payload = additionalFoodRequest(food, '2', '2026-10-19', '2026-10-18');
  assert.deepEqual(payload, { items: [{ food_item_id: 7, quantity: 2 }], serving_date: '2026-10-19' });
  assert.doesNotThrow(() => validateAdditionalFoodOrder(payload.items, [food], payload.serving_date, '2026-10-18', '2026-10-18T12:00:00+05:30'));
});
test('rejects another weekday, past dates, and invalid dates before submission', () => {
  for (const date of ['2026-10-20', '2026-10-12', '2026-02-30', 'invalid']) {
    assert.throws(() => additionalFoodRequest(food, 1, date, '2026-10-18'));
  }
});
test('rejects unavailable food and invalid quantities', () => {
  assert.throws(() => additionalFoodRequest({ ...food, is_available: false }, 1, '2026-10-19', '2026-10-18'));
  for (const quantity of ['', 0, -1, 1.5, 1001, 'abc']) {
    assert.throws(() => additionalFoodRequest(food, quantity, '2026-10-19', '2026-10-18'));
  }
});

test('mobile confirmation blocks late requests with the same deadline as the server', () => {
  const scheduled = { ...food, order_deadline_time: '16:00' };
  assert.doesNotThrow(() => buildRequest(scheduled, 1, '2026-10-19', '2026-10-19', '2026-10-19T15:59:59+05:30'));
  assert.throws(() => buildRequest(scheduled, 1, '2026-10-19', '2026-10-19', '2026-10-19T16:00:00+05:30'), /closed/);
});

test('mobile request respects the maximum set by mess staff', () => {
  assert.throws(() => additionalFoodRequest(food, 3, '2026-10-19', '2026-10-18'), /Maximum 2/);
});
