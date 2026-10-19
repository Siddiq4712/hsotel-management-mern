import { inventoryScope } from './inventoryScope.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Hostel, Item, UOM, Menu, MenuItem, ItemStock, InventoryBatch, MenuSchedule } from '../models/index.js';
import { MenuPlanningSettings, WeeklyMenuPlan, PlannedDailyMeal, MenuPlanningChange } from '../models/menuPlanning.js';
import { DEFAULT_CONFIGURATION, fail, integer, text, validDate, today, canEdit, validateConfiguration, resolveDay, validateActualConsumption } from '../utils/weeklyMenu.js';
import { _recordBulkConsumptionLogic } from '../controllers/messController.js';

export async function planningHostel(req) {
  const id = integer(req.user.role === 'admin' ? (req.query.hostel_id || req.body?.hostel_id || req.header?.('X-Entry-Hostel-Id')) : req.user.hostel_id, 'Hostel', 1, 2147483647);
  if (!await Hostel.findByPk(id)) fail('Hostel not found', 404);
  return id;
}
export async function settingsFor(hostel_id, transaction, lock = false) {
  await MenuPlanningSettings.findOrCreate({ where: { hostel_id }, defaults: { configuration: DEFAULT_CONFIGURATION }, transaction });
  return MenuPlanningSettings.findByPk(hostel_id, { transaction, ...(lock ? { lock: transaction.LOCK.UPDATE } : {}) });
}
export async function resolvedMeals(hostel_id, date, transaction, settings) {
  validDate(date);
  settings ||= await settingsFor(hostel_id, transaction);
  const [plans, records] = await Promise.all([
    WeeklyMenuPlan.findAll({ where: { hostel_id, effective_from: { [Op.lte]: date } }, transaction, raw: true,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) }),
    PlannedDailyMeal.findAll({ where: { hostel_id, date }, transaction, raw: true,
      ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) })
  ]);
  return resolveDay(plans, records, settings.configuration, date).map(meal => ({ ...meal,
    source_key: `${meal.source_key}:settings:${settings.revision}` }));
}
async function audit(req, hostel_id, action, reason, details, transaction) {
  await MenuPlanningChange.create({ hostel_id, actor_id: req.user.userId, actor_name: req.user.userName || req.user.role,
    action, reason: text(reason, 'Reason'), details }, { transaction });
}
async function mutate(req, action, work) {
  const hostel_id = await planningHostel(req);
  return sequelize.transaction({ isolationLevel: 'READ COMMITTED' }, async transaction => {
    // All planning writes for one hostel share this lock, including consumption confirmation.
    const settings = await settingsFor(hostel_id, transaction, true);
    if (!canEdit(settings.configuration, req.user.role, action)) fail('You do not have permission for this menu action', 403);
    return work({ hostel_id, transaction, settings });
  });
}
export async function planningMetadata(req) {
  const hostel_id = await planningHostel(req);
  const settings = await settingsFor(hostel_id);
  const [plans, menus, items, stock, history] = await Promise.all([
    WeeklyMenuPlan.findAll({ where: { hostel_id }, order: [['effective_from', 'DESC']], raw: true }),
    Menu.findAll({ where: { hostel_id }, attributes: ['id', 'name', 'estimated_servings'], order: [['name', 'ASC']], raw: true }),
    Item.findAll({ include: [{ model: UOM, as: 'UOM' }], order: [['name', 'ASC']] }),
    ItemStock.findAll({ where: { ...(await inventoryScope(hostel_id))}, raw: true }),
    MenuPlanningChange.findAll({ where: { hostel_id }, order: [['id', 'DESC']], limit: 100, raw: true })
  ]);
  const permissions = Object.fromEntries(['plan', 'override', 'consume', 'settings'].map(action => [action, canEdit(settings.configuration, req.user.role, action)]));
  return { hostel_id, settings: settings.configuration, settings_revision: settings.revision, permissions,
    can_manage_permissions: req.user.role === 'admin', plans, menus, history,
    items: items.map(item => ({ id: item.id, name: item.name, unit_id: item.unit_id,
      unit: item.UOM?.abbreviation || '', current_stock: Number(stock.find(s => s.item_id === item.id)?.current_stock || 0) })) };
}
export async function savePlanningSettings(req) {
  return mutate(req, 'settings', async ({ hostel_id, transaction, settings }) => {
    if (req.body.revision !== settings.revision) fail('Settings changed. Reload before saving.', 409);
    const configuration = validateConfiguration(req.body.configuration || {});
    const permissionsChanged = ['plan', 'override', 'consume', 'settings'].some(action =>
      [...configuration.permissions[action]].sort().join(',') !== [...settings.configuration.permissions[action]].sort().join(','));
    if (req.user.role !== 'admin' && permissionsChanged) fail('Only administrators may change permissions', 403);
    const before = settings.configuration;
    await settings.update({ configuration, revision: settings.revision + 1 }, { transaction });
    await audit(req, hostel_id, 'settings', req.body.reason, { before, after: configuration }, transaction);
    return configuration;
  });
}
export async function publishWeeklyPlan(req) {
  return mutate(req, 'plan', async ({ hostel_id, transaction, settings }) => {
    const body = req.body;
    const name = text(body.name, 'Plan name', 120);
    const effective_from = validDate(body.effective_from);
    const effective_to = body.effective_to ? validDate(body.effective_to) : null;
    if (effective_from < today()) fail('Publish plans from today or a future date to preserve previous menus');
    if (!['regular', 'temporary'].includes(body.kind)) fail('Choose regular or temporary plan');
    if (effective_to && effective_to < effective_from) fail('End date must be on or after the start date');
    if (body.kind === 'temporary' && !effective_to) fail('Temporary plans need an end date');
    const default_count = integer(body.default_count, 'Default student count');
    if (body.settings_revision !== settings.revision) fail('Settings changed. Reload the weekly plan editor.', 409);
    if (!Array.isArray(body.meals) || !body.meals.length || body.meals.length > 84) fail('Add at least one weekly meal');
    const seen = new Set();
    const meals = [];
    for (const entry of body.meals) {
      if (!entry || typeof entry !== 'object') fail('Each weekly meal must include a weekday, meal slot and dishes');
      const day = integer(entry.day, 'Weekday', 0, 6);
      const slot = settings.configuration.slots.find(s => s.key === entry.slot_key);
      if (!slot || seen.has(`${day}:${slot.key}`)) fail('Each weekday and meal slot may appear only once');
      seen.add(`${day}:${slot.key}`);
      const meal = { day, slot_key: slot.key, dishes: text(entry.dishes, 'Dishes', 1000), menu_id: null, ingredients: [] };
      if (entry.menu_id) {
        const menu = await Menu.findOne({ where: { id: integer(entry.menu_id, 'Menu template', 1), hostel_id },
          include: [{ model: MenuItem, as: 'tbl_Menu_Items' }], transaction });
        if (!menu) fail('Ingredient template not found in this hostel');
        if (!(menu.estimated_servings > 0)) fail(`${menu.name} needs a positive serving count before it can suggest ingredients`);
        meal.menu_id = menu.id;
        for (const ingredient of menu.tbl_Menu_Items) {
          const item = await Item.findByPk(ingredient.item_id, { transaction });
          if (!item || item.unit_id !== ingredient.unit_id) fail('Template ingredients must use the inventory base unit. Update the template first.');
          const quantity_per_serving = Number(ingredient.quantity) / menu.estimated_servings;
          if (!(quantity_per_serving > 0)) fail('Template ingredient quantities must be positive');
          meal.ingredients.push({ item_id: item.id, unit_id: item.unit_id, quantity_per_serving });
        }
      }
      meals.push(meal);
    }
    const plan = await WeeklyMenuPlan.create({ hostel_id, name, kind: body.kind, effective_from, effective_to, default_count,
      slots: settings.configuration.slots, meals, created_by: req.user.userId }, { transaction });
    await audit(req, hostel_id, 'publish_plan', body.reason, { plan_id: plan.id, name, effective_from, effective_to }, transaction);
    return plan;
  });
}
async function dailyContext(req, scope) {
  const date = validDate(req.params.date);
  const slot_key = req.params.slot;
  const meals = await resolvedMeals(scope.hostel_id, date, scope.transaction, scope.settings);
  const meal = meals.find(m => m.slot_key === slot_key);
  if (!meal) fail('Meal slot not found', 404);
  if (meal.status === 'served') fail('Consumption has already been recorded for this meal', 409);
  if (req.body.source_key !== meal.source_key) fail('This meal changed. Reload it before saving.', 409);
  return { date, slot_key, meal };
}
export async function overrideDailyMeal(req) {
  return mutate(req, 'override', async scope => {
    const { date, slot_key, meal } = await dailyContext(req, scope);
    if (date < today()) fail('Past menu plans cannot be changed');
    if (!['planned', 'skipped'].includes(req.body.status)) fail('Choose planned or skipped');
    const snapshot = { slot: meal.slot, plan_id: meal.plan_id, plan_name: meal.plan_name, menu_id: meal.menu_id,
      ingredients: meal.ingredients, dishes: text(req.body.dishes, 'Dishes', 1000),
      expected_count: integer(req.body.expected_count, 'Expected students') };
    // Replacement dishes can opt out of the original ingredient suggestions.
    if (req.body.clear_ingredients) { snapshot.ingredients = []; snapshot.menu_id = null; }
    const where = { hostel_id: scope.hostel_id, date, slot_key };
    const existing = await PlannedDailyMeal.findOne({ where, transaction: scope.transaction, lock: scope.transaction.LOCK.UPDATE });
    const values = { snapshot, status: req.body.status, revision: existing ? existing.revision + 1 : 1 };
    if (existing) await existing.update(values, { transaction: scope.transaction });
    else await PlannedDailyMeal.create({ ...where, ...values }, { transaction: scope.transaction });
    await audit(req, scope.hostel_id, 'daily_override', req.body.reason, { date, slot_key, before: meal, after: values }, scope.transaction);
    return snapshot;
  });
}
export async function consumeDailyMeal(req) {
  return mutate(req, 'consume', async scope => {
    const { date, slot_key, meal } = await dailyContext(req, scope);
    if (date !== today()) fail('Record consumption on the meal date. Past and future menus are available for viewing.');
    if (!meal.configured || meal.status === 'skipped') fail('Configure this meal and ensure it is not skipped before recording consumption');
    const legacyServed = await MenuSchedule.findOne({ where: { hostel_id: scope.hostel_id, scheduled_date: date,
      meal_time: meal.slot.category, status: 'served' }, transaction: scope.transaction });
    if (legacyServed) fail('A previous schedule has already recorded stock consumption for this meal category and date. Review it before recording again.', 409);
    const actual = validateActualConsumption(req.body.items);
    const consumptions = [];
    for (const row of actual) {
      const item = await Item.findByPk(row.item_id, { transaction: scope.transaction });
      const stock = await ItemStock.findOne({ where: { item_id: row.item_id, ...(await inventoryScope(scope.hostel_id, scope.transaction)) }, transaction: scope.transaction, lock: scope.transaction.LOCK.UPDATE });
      if (!item || !stock || Number(stock.current_stock) < row.quantity) fail(`Insufficient inventory stock for ingredient ${row.item_id}`);
      if (!item.unit_id) fail(`Configure the inventory base unit for ${item.name} before recording consumption`);
      const batches = await InventoryBatch.findAll({ where: { item_id: row.item_id, ...(await inventoryScope(scope.hostel_id, scope.transaction)), status: 'active', quantity_remaining: { [Op.gt]: 0 } }, transaction: scope.transaction, lock: scope.transaction.LOCK.UPDATE });
      if (batches.reduce((sum, batch) => sum + Number(batch.quantity_remaining), 0) < row.quantity) fail(`Insufficient active stock batches for ${item.name}`);
      consumptions.push({ item_id: item.id, quantity_consumed: row.quantity, unit: item.unit_id,
        consumption_date: date, meal_type: meal.slot.category });
    }
    const result = await _recordBulkConsumptionLogic(consumptions, scope.hostel_id, req.user.userId, scope.transaction);
    const total_cost = result.createdDailyConsumptions.reduce((sum, row) => sum + Number(row.total_cost), 0);
    const snapshot = { slot: meal.slot, dishes: meal.dishes, expected_count: meal.expected_count,
      ingredients: meal.ingredients, menu_id: meal.menu_id, plan_id: meal.plan_id, plan_name: meal.plan_name };
    const where = { hostel_id: scope.hostel_id, date, slot_key };
    const existing = await PlannedDailyMeal.findOne({ where, transaction: scope.transaction, lock: scope.transaction.LOCK.UPDATE });
    const values = { snapshot, status: 'served', actual_consumption: actual.map((row, index) => ({ ...row,
      consumption_id: result.createdDailyConsumptions[index].id })), total_cost, recorded_by: req.user.userId,
      revision: existing ? existing.revision + 1 : 1 };
    if (existing) await existing.update(values, { transaction: scope.transaction });
    else await PlannedDailyMeal.create({ ...where, ...values }, { transaction: scope.transaction });
    await audit(req, scope.hostel_id, 'record_consumption', req.body.reason, { date, slot_key, total_cost, items: values.actual_consumption }, scope.transaction);
    return { total_cost, lowStockItems: result.lowStockItems };
  });
}
