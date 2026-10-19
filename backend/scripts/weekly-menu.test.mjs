import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIGURATION, validateConfiguration, resolvePlan, resolveDay, validateActualConsumption, validDate, canEdit, integer } from '../utils/weeklyMenu.js';

const slots = [DEFAULT_CONFIGURATION.slots[1]];
const plan = (id, extra = {}) => ({ id, kind: 'regular', name: `Plan ${id}`, effective_from: '2026-01-01', effective_to: null,
  default_count: 100, slots, meals: [{ day: 1, slot_key: 'lunch', dishes: 'Rice and sambar', ingredients: [{ item_id: 1, quantity_per_serving: .1 }] }], ...extra });

test('weekly recurrence repeats across months without schedule rows', () => {
  for (const date of ['2026-01-05', '2026-06-01', '2026-12-28']) {
    const meal = resolveDay([plan(1)], [], DEFAULT_CONFIGURATION, date)[0];
    assert.equal(meal.dishes, 'Rice and sambar'); assert.equal(meal.expected_count, 100); assert.equal(meal.configured, true);
  }
});
test('effective dates and same-day revisions select the newest published plan', () => {
  const plans = [plan(1), plan(2, { effective_from: '2026-06-01' }), plan(3, { effective_from: '2026-06-01' })];
  assert.equal(resolvePlan(plans, '2026-05-31').id, 1);
  assert.equal(resolvePlan(plans, '2026-06-01').id, 3);
  assert.equal(resolvePlan(plans, '2025-12-31'), null);
});
test('temporary plans override inclusively and the regular plan resumes afterwards', () => {
  const plans = [plan(1), plan(2, { kind: 'temporary', effective_from: '2026-06-01', effective_to: '2026-06-07' })];
  assert.equal(resolvePlan(plans, '2026-06-01').id, 2);
  assert.equal(resolvePlan(plans, '2026-06-07').id, 2);
  assert.equal(resolvePlan(plans, '2026-06-08').id, 1);
});
test('an expired newer regular plan does not unexpectedly revive an older plan', () => {
  assert.equal(resolvePlan([plan(1), plan(2, { effective_from: '2026-06-01', effective_to: '2026-06-02' })], '2026-06-03'), null);
});
test('daily overrides and recorded consumption retain their snapshots after annual plan changes', () => {
  const records = [{ id: 8, slot_key: 'lunch', revision: 2, status: 'served', total_cost: '1000.00',
    snapshot: { slot: slots[0], dishes: 'Vegetable rice', expected_count: 120, plan_id: 1, ingredients: [] }, actual_consumption: [{ item_id: 1, quantity: 11 }] }];
  const meal = resolveDay([plan(99)], records, DEFAULT_CONFIGURATION, '2026-06-01')[0];
  assert.equal(meal.dishes, 'Vegetable rice'); assert.equal(meal.expected_count, 120); assert.equal(meal.plan_id, 1);
  assert.equal(meal.source_key, 'daily:8:2'); assert.equal(meal.actual_consumption[0].quantity, 11);
  const followingWeek = resolveDay([plan(99)], [], DEFAULT_CONFIGURATION, '2026-06-08')[0];
  assert.equal(followingWeek.expected_count, 100); assert.equal(followingWeek.dishes, 'Rice and sambar');
});
test('published custom slots and historical daily slots survive later settings changes', () => {
  const custom = { key: 'night_milk', label: 'Night milk', time: '21:00', category: 'snacks' };
  const p = plan(1, { slots: [custom], meals: [{ day: 1, slot_key: custom.key, dishes: 'Milk', ingredients: [] }] });
  const meal = resolveDay([p], [], DEFAULT_CONFIGURATION, '2026-06-01')[0];
  assert.equal(meal.slot.key, 'night_milk'); assert.equal(meal.dishes, 'Milk');
  const oldRecord = { id: 3, slot_key: custom.key, revision: 1, status: 'served', snapshot: { slot: custom, dishes: 'Milk' } };
  assert(resolveDay([plan(2)], [oldRecord], DEFAULT_CONFIGURATION, '2026-06-01').some(m => m.slot.key === custom.key));
});
test('settings permit custom slots but reject duplicate IDs, invalid times, and privilege injection', () => {
  const config = structuredClone(DEFAULT_CONFIGURATION);
  config.slots.push({ key: 'milk', label: 'Night milk', time: '21:00', category: 'snacks' });
  assert.equal(validateConfiguration(config).slots.length, 5);
  assert.throws(() => validateConfiguration({ ...config, slots: [...config.slots, config.slots[0]] }));
  assert.throws(() => validateConfiguration({ ...config, slots: [{ ...config.slots[0], time: '25:00' }] }));
  assert.throws(() => validateConfiguration({ ...config, permissions: { ...config.permissions, consume: ['student'] } }));
  assert.equal(canEdit(config, 'admin', 'settings'), true); assert.equal(canEdit(config, 'warden', 'consume'), false);
});
test('consumption requires unique ingredients with positive stock precision quantities', () => {
  assert.deepEqual(validateActualConsumption([{ item_id: 2, quantity: 11 }, { item_id: 1, quantity: .25 }]), [{ item_id: 1, quantity: .25 }, { item_id: 2, quantity: 11 }]);
  for (const bad of [[], [{ item_id: 1, quantity: 0 }], [{ item_id: 1, quantity: -.1 }], [{ item_id: 1, quantity: .001 }], [{ item_id: 1, quantity: 2 }, { item_id: 1, quantity: 3 }]]) assert.throws(() => validateActualConsumption(bad));
});
test('dates and student counts reject rollover dates, missing values and fractions', () => {
  assert.equal(validDate('2028-02-29'), '2028-02-29');
  for (const bad of ['2026-02-29', '2026-02-31', 'tomorrow', '']) assert.throws(() => validDate(bad));
  for (const bad of [undefined, null, '', 1.5, -2, false]) assert.throws(() => integer(bad, 'Count'));
});
