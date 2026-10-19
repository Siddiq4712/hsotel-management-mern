import test from 'node:test';
import assert from 'node:assert/strict';
import { WeeklyMenuPlan, PlannedDailyMeal } from '../models/menuPlanning.js';
import { resolvedMeals } from '../services/weeklyMenuPlanning.js';
import { DEFAULT_CONFIGURATION } from '../utils/weeklyMenu.js';

test('confirmation reads the latest served state after waiting for the hostel lock, rather than a repeatable-read snapshot', async () => {
  const previous = [WeeklyMenuPlan.findAll, PlannedDailyMeal.findAll];
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  try {
    WeeklyMenuPlan.findAll = async options => {
      assert.equal(options.transaction, transaction); assert.equal(options.lock, 'UPDATE'); return [];
    };
    PlannedDailyMeal.findAll = async options => {
      assert.equal(options.transaction, transaction); assert.equal(options.lock, 'UPDATE');
      return [{ id: 1, slot_key: 'lunch', revision: 2, status: 'served', snapshot: { slot: DEFAULT_CONFIGURATION.slots[1], dishes: 'Rice' } }];
    };
    const meals = await resolvedMeals(2, '2026-10-17', transaction, { configuration: DEFAULT_CONFIGURATION, revision: 1 });
    assert.equal(meals.find(meal => meal.slot_key === 'lunch').status, 'served');
  } finally { [WeeklyMenuPlan.findAll, PlannedDailyMeal.findAll] = previous; }
});
