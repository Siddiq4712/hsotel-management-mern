import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAdditionalFood, validateAdditionalFoodOrder as validateOrder } from '../utils/additionalFood.js';

const validateAdditionalFoodOrder = (items, foods, date, today) => validateOrder(items, foods, date, today, '2026-10-18T12:00:00+05:30');
const input = { name: ' Extra egg ', price: 12.50, category: 'non-veg', meal_type: 'lunch', max_quantity_per_student: 2, weekly_day: 1 };
const food = { max_quantity_per_student: 2, id: 7, name: 'Extra egg', price: 12.50, weekly_day: 1, is_available: true };
const items = [{ food_item_id: 7, quantity: 2 }];
test('normalizes weekly food and permits free items and Sunday', () => {
  assert.deepEqual(normalizeAdditionalFood(input), { name: 'Extra egg', price: 12.50, category: 'Non-Veg', meal_type: 'Lunch', max_quantity_per_student: 2, weekly_day: 1, order_deadline_time: '19:00', expiry_time: null, is_available: true });
  assert.equal(normalizeAdditionalFood({ ...input, weekly_day: 0, price: 0 }).weekly_day, 0);
});
test('requires a meal category, a valid price, and an explicit weekday', () => {
  for (const invalid of [{ category: 'Snacks' }, { price: -1 }, { price: '' }, { price: 2.345 }, { price: Infinity }, { weekly_day: null }, { weekly_day: '' }, { weekly_day: 7 }, { weekly_day: 1.5 }, { weekly_day: undefined }, { name: '  ' }]) {
    assert.throws(() => normalizeAdditionalFood({ ...input, ...invalid }));
  }
});
test('accepts the scheduled weekday and rejects other weekdays and past dates', () => {
  assert.doesNotThrow(() => validateAdditionalFoodOrder(items, [food], '2026-10-19', '2026-10-18'));
  for (const date of ['2026-10-20', '2026-10-12', '2026-02-30', 'invalid']) assert.throws(() => validateAdditionalFoodOrder(items, [food], date, '2026-10-18'));
});
test('rejects hidden, missing, expired, and invalid-price food', () => {
  for (const foods of [[], [{ ...food, is_available: false }], [{ ...food, expiry_time: '2020-01-01' }], [{ ...food, price: 'invalid' }]]) {
    assert.throws(() => validateAdditionalFoodOrder(items, foods, '2026-10-19', '2026-10-18'));
  }
});
test('rejects malformed, duplicate, fractional, and excessive quantities', () => {
  for (const bad of [[null], [], [...items, ...items], [{ food_item_id: 7, quantity: 0 }], [{ food_item_id: 7, quantity: 1.5 }], [{ food_item_id: 7, quantity: 1001 }]]) {
    assert.throws(() => validateAdditionalFoodOrder(bad, null, '2026-10-19', '2026-10-18'));
  }
});
test('preserves unscheduled legacy items but rejects amounts beyond the database limit', () => {
  assert.doesNotThrow(() => validateAdditionalFoodOrder(items, [{ ...food, weekly_day: null }], '2026-10-20', '2026-10-18'));
  assert.throws(() => validateAdditionalFoodOrder(items, [{ ...food, price: 99999999.99 }], '2026-10-19', '2026-10-18'), /too large/);
});

test('enforces a same-day 4 PM cutoff in IST at the exact boundary and accepts the prior day', () => {
  const scheduled = { ...food, order_deadline_time: '16:00' };
  assert.doesNotThrow(() => validateOrder(items, [scheduled], '2026-10-19', '2026-10-19', '2026-10-19T15:59:59+05:30'));
  assert.throws(() => validateOrder(items, [scheduled], '2026-10-19', '2026-10-19', '2026-10-19T16:00:00+05:30'), /closed/);
  assert.throws(() => validateOrder(items, [scheduled], '2026-10-19', '2026-10-19', '2026-10-19T11:00:00Z'), /closed/);
  assert.doesNotThrow(() => validateOrder(items, [scheduled], '2026-10-19', '2026-10-18', '2026-10-18T21:00:00+05:30'));
});
test('allows up to 7 PM and rejects later or malformed supervisor deadlines', () => {
  for (const value of ['00:00', '16:00', '19:00']) assert.equal(normalizeAdditionalFood({ ...input, order_deadline_time: value }).order_deadline_time, value);
  for (const value of ['19:01', '20:00', '7:00', '16:99', '', null]) assert.throws(() => normalizeAdditionalFood({ ...input, order_deadline_time: value }));
});

test('dietary category and meal are separate required fields for all six combinations', () => {
  for (const category of ['Veg', 'Non-Veg']) for (const meal_type of ['Breakfast', 'Lunch', 'Dinner']) {
    const normalized = normalizeAdditionalFood({ ...input, category, meal_type });
    assert.equal(normalized.category, category);
    assert.equal(normalized.meal_type, meal_type);
  }
  for (const invalid of [{ category: 'Breakfast' }, { meal_type: undefined }, { meal_type: 'Veg' }, { category: 'Unspecified' }]) assert.throws(() => normalizeAdditionalFood({ ...input, ...invalid }));
});

test('validates configured quantity limits and blocks requests above the maximum', () => {
  for (const maximum of [0, -1, 1.5, 1001, 'invalid']) assert.throws(() => normalizeAdditionalFood({ ...input, max_quantity_per_student: maximum }));
  assert.throws(() => validateAdditionalFoodOrder([{ food_item_id: 7, quantity: 3 }], [food], '2026-10-19', '2026-10-18'), /Maximum 2/);
});
