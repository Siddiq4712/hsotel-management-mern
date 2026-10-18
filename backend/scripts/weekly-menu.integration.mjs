// Creates only the new feature tables; all test data and consumption are rolled back.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import sequelize from '../config/database.js';
import { initAssociations, Hostel, Role, User, ItemCategory, Item, ItemStock, InventoryBatch, UOM, Menu, MenuItem, DailyConsumption, DailyMessCharge, MenuSchedule } from '../models/index.js';
import { MenuPlanningSettings, WeeklyMenuPlan, PlannedDailyMeal, MenuPlanningChange } from '../models/menuPlanning.js';
import { planningHostel, planningMetadata, publishWeeklyPlan, resolvedMeals, savePlanningSettings, overrideDailyMeal, consumeDailyMeal } from '../services/weeklyMenuPlanning.js';
import { today, DEFAULT_CONFIGURATION } from '../utils/weeklyMenu.js';
import { ensureMenuPlanningSchema } from '../services/menuPlanningSchema.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';

initAssociations();
if (process.env.DEBUG_MENU_TEST) sequelize.options.logging = sql => { if (/SAVEPOINT|ROLLBACK|tbl_DailyConsumption|tbl_ItemStock/.test(sql)) console.log(sql); };
await ensureMenuPlanningSchema();
const originalTransaction = sequelize.transaction.bind(sequelize);
const transaction = await originalTransaction();
sequelize.addHook('beforeFind', 'weeklyMenuFixture', options => { options.transaction ||= transaction; });
sequelize.addHook('beforeCount', 'weeklyMenuFixture', options => { options.transaction ||= transaction; });
// Sequelize's nested findOrCreate mutates its parent's savepoint name. Restore
// the fixture savepoint before managed rollback (production uses a root transaction).
sequelize.transaction = (options, callback) => typeof options === 'function'
  ? originalTransaction({ transaction }, async inner => {
    const savepointName = inner.name;
    try { return await options(inner); } finally { inner.name = savepointName; }
  })
  : originalTransaction({ ...options, transaction: options?.transaction || transaction }, callback);
const tag = crypto.randomUUID();
try {
  const hostel = await Hostel.create({ name: `Weekly menu test ${tag}`, capacity: 100 }, { transaction });
  const other = await Hostel.create({ name: `Weekly menu isolation ${tag}`, capacity: 5 }, { transaction });
  const inventory = await Inventory.create({ name: `Weekly menu inventory ${tag}` }, { transaction });
  await InventoryHostel.create({ hostel_id: hostel.id, inventory_id: inventory.id }, { transaction });
  const role = await Role.create({ roleName: `WeeklyMenu-${tag}` }, { transaction });
  const actor = await User.create({ userName: 'Menu integration test', userMail: `${tag}@invalid.test`, password: 'test-only', roleId: role.roleId, hostel_id: hostel.id }, { transaction });
  const unit = await UOM.create({ name: `Test kg ${tag}`, abbreviation: 'kg', type: 'weight' }, { transaction });
  const category = await ItemCategory.create({ name: `Test category ${tag}` }, { transaction });
  const rice = await Item.create({ name: `Test rice ${tag}`, category_id: category.id, unit_id: unit.id }, { transaction });
  const stock = await ItemStock.create({ item_id: rice.id, hostel_id: hostel.id, inventory_id: inventory.id, current_stock: 100, minimum_stock: 10 }, { transaction });
  await InventoryBatch.bulkCreate([{ item_id: rice.id, hostel_id: hostel.id, inventory_id: inventory.id, quantity_purchased: 40, quantity_remaining: 40, unit_price: 40, purchase_date: today() },
    { item_id: rice.id, hostel_id: hostel.id, inventory_id: inventory.id, quantity_purchased: 60, quantity_remaining: 60, unit_price: 60, purchase_date: today() }], { transaction });
  const template = await Menu.create({ hostel_id: hostel.id, name: 'Rice test template', meal_type: 'lunch', estimated_servings: 100, date: today() }, { transaction });
  await MenuItem.create({ menu_id: template.id, item_id: rice.id, quantity: 10, unit_id: unit.id }, { transaction });
  const request = (body = {}, params = {}, roleName = 'mess') => ({ user: { userId: actor.userId, userName: actor.userName, role: roleName, hostel_id: hostel.id },
    body, params, query: { hostel_id: other.id } });
  assert.equal(await planningHostel(request()), hostel.id, 'non-admin query cannot change hostel scope');
  let meta = await planningMetadata(request());
  assert.equal(meta.permissions.consume, true); assert.equal(meta.settings.default_count, 0);
  const day = new Date(`${today()}T12:00:00Z`).getUTCDay();
  const planInput = { name: 'Test annual menu', kind: 'regular', effective_from: today(), default_count: 100,
    settings_revision: 1, reason: 'Integration test', meals: [{ day, slot_key: 'lunch', dishes: 'Rice and sambar', menu_id: template.id }] };
  const plan = await publishWeeklyPlan(request(planInput));
  assert(plan.id);
  let meal = (await resolvedMeals(hostel.id, today(), transaction)).find(row => row.slot_key === 'lunch');
  assert.equal(meal.ingredients[0].quantity_per_serving, .1);
  await assert.rejects(() => publishWeeklyPlan(request(planInput, {}, 'warden')), error => error.status === 403);
  await assert.rejects(() => overrideDailyMeal(request({ source_key: 'stale', dishes: 'New meal', expected_count: 120, status: 'planned', reason: 'Test' }, { date: today(), slot: 'lunch' })), error => error.status === 409);
  await overrideDailyMeal(request({ source_key: meal.source_key, dishes: meal.dishes, expected_count: 120, status: 'planned', reason: 'Holiday count' }, { date: today(), slot: 'lunch' }));
  meal = (await resolvedMeals(hostel.id, today(), transaction)).find(row => row.slot_key === 'lunch');
  assert.equal(meal.expected_count, 120); assert.equal(meal.ingredients[0].quantity_per_serving, .1);
  const consume = body => consumeDailyMeal(request({ source_key: meal.source_key, items: [{ item_id: rice.id, quantity: 11 }], reason: 'Kitchen actual', ...body }, { date: today(), slot: 'lunch' }));
  const baselineConsumption = await DailyConsumption.count({ where: { hostel_id: hostel.id }, transaction });
  assert.equal(baselineConsumption, 0, 'fixture hostel starts without consumption records');
  await assert.rejects(() => consume({ items: [{ item_id: rice.id, quantity: 101 }] }), /Insufficient/);
  assert.equal(Number((await stock.reload({ transaction })).current_stock), 100);
  // Force a late validation failure after inventory writes to verify the shared transaction rolls everything back.
  await assert.rejects(() => consume({ reason: '' }), /Reason/);
  assert.equal(Number((await stock.reload({ transaction })).current_stock), 100);
  assert.equal(await DailyConsumption.count({ where: { hostel_id: hostel.id }, transaction }), 0, 'failed recording leaves no consumption row');
  const result = await consume({});
  assert.equal(result.total_cost, 572, '11 kg uses weighted average of 40 kg @ 40 and 60 kg @ 60');
  assert.equal(Number((await stock.reload({ transaction })).current_stock), 89);
  assert.equal(await DailyConsumption.count({ where: { hostel_id: hostel.id }, transaction }), 1);
  assert.equal(await DailyMessCharge.count({ where: { hostel_id: hostel.id }, transaction }), 0, 'cooking count does not change individual billing');
  await assert.rejects(() => consume({}), error => error.status === 409);
  const served = (await resolvedMeals(hostel.id, today(), transaction)).find(row => row.slot_key === 'lunch');
  assert.equal(served.status, 'served'); assert.equal(served.actual_consumption[0].quantity, 11);
  await publishWeeklyPlan(request({ ...planInput, name: 'Revised same day', meals: [{ day, slot_key: 'lunch', dishes: 'Different menu' }] }));
  assert.equal((await resolvedMeals(hostel.id, today(), transaction)).find(row => row.slot_key === 'lunch').dishes, 'Rice and sambar', 'served snapshot is preserved');
  const newConfig = structuredClone(DEFAULT_CONFIGURATION); newConfig.slots.push({ key: 'milk', label: 'Night milk', time: '21:00', category: 'snacks' });
  await savePlanningSettings(request({ configuration: newConfig, revision: 1, reason: 'Add custom slot' }));
  await assert.rejects(() => savePlanningSettings(request({ configuration: newConfig, revision: 1, reason: 'Stale settings' })), error => error.status === 409);
  newConfig.permissions.consume = ['warden'];
  await assert.rejects(() => savePlanningSettings(request({ configuration: newConfig, revision: 2, reason: 'Privilege escalation' })), error => error.status === 403);
  assert.equal(await PlannedDailyMeal.count({ where: { hostel_id: other.id }, transaction }), 0);
  assert.equal(await WeeklyMenuPlan.count({ where: { hostel_id: hostel.id }, transaction }), 2);
  assert.equal(await MenuSchedule.count({ where: { hostel_id: hostel.id }, transaction }), 0, 'recurrence does not create legacy schedules');
  assert((await MenuPlanningChange.count({ where: { hostel_id: hostel.id }, transaction })) >= 5);
  console.log('PASS: MySQL plan publication; ingredient snapshots; hostel isolation; warden permissions; stale-write protection; count overrides; stock shortage; full rollback; actual weighted-average consumption; duplicate protection; unchanged student charges; preserved served history; custom slots; settings permissions.');
} finally {
  sequelize.transaction = originalTransaction;
  sequelize.removeHook('beforeFind', 'weeklyMenuFixture'); sequelize.removeHook('beforeCount', 'weeklyMenuFixture');
  await transaction.rollback(); await sequelize.close();
  console.log('All integration fixture data rolled back.');
}
