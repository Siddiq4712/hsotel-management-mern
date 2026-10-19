import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Hostel, ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption, MessDailyExpense } from '../models/index.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { InventoryBillingPolicy, InventoryMealEntry } from '../models/inventoryBilling.js';
import { inventoryPolicy, datePeriod, schoolToday, hasPeriodActivity } from '../services/inventoryBilling.js';

export async function listInventories(req, res) {
  try {
    const assignments = await InventoryHostel.findAll({ raw: true });
    const allowed = req.user.role === 'admin' ? null : assignments.find(row => row.hostel_id === req.user.hostel_id)?.inventory_id;
    const [inventories, hostels] = await Promise.all([
      Inventory.findAll({ ...(allowed === null ? {} : { where: { id: allowed || 0 } }), order: [['name', 'ASC']], raw: true }),
      Hostel.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']], raw: true }),
    ]);
    const policies = await InventoryBillingPolicy.findAll({ order: [['effective_from', 'ASC']], raw: true });
    const dated = await Promise.all(inventories.map(async inventory => ({ ...inventory, billing_policy: await inventoryPolicy(inventory.id, req.query?.date),
      billing_policies: policies.filter(row => row.inventory_id === inventory.id),
      hostels: hostels.filter(hostel => assignments.some(row => row.hostel_id === hostel.id && row.inventory_id === inventory.id)),
    })));
    res.json({ success: true, data: dated });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
}

export async function deleteInventory(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ success: false, message: 'Choose a valid inventory.' });
  try {
    await sequelize.transaction(async transaction => {
      const inventory = await Inventory.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!inventory) throw Object.assign(new Error('Inventory not found.'), { status: 404 });
      const where = { inventory_id: id };
      if (await InventoryHostel.count({ where, transaction })) {
        throw Object.assign(new Error('Reassign all hostels to another inventory before deleting this inventory.'), { status: 409 });
      }
      for (const model of [ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption, MessDailyExpense, InventoryMealEntry]) {
        if (await model.count({ where, transaction })) {
          throw Object.assign(new Error('This inventory has stock or history and cannot be deleted.'), { status: 409 });
        }
      }
      if (await InventoryBillingPolicy.count({ where: { ...where, mode: 'shared' }, transaction })) throw Object.assign(new Error('This inventory has shared billing policy history and cannot be deleted.'), { status: 409 });
      await InventoryBillingPolicy.destroy({ where, transaction });
      await inventory.destroy({ transaction });
    });
    return res.json({ success: true, message: 'Inventory deleted successfully.' });
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: error.message }); }
}

async function combineStock(sourceId, targetId, transaction) {
  const rows = await ItemStock.findAll({ where: { inventory_id: sourceId }, transaction, lock: transaction.LOCK.UPDATE });
  for (const row of rows) {
    const target = await ItemStock.findOne({ where: { inventory_id: targetId, item_id: row.item_id }, transaction, lock: transaction.LOCK.UPDATE });
    if (target) {
      await target.update({ current_stock: Number(target.current_stock) + Number(row.current_stock),
        minimum_stock: Number(target.minimum_stock) + Number(row.minimum_stock),
        last_purchase_date: [target.last_purchase_date, row.last_purchase_date].filter(Boolean).sort().at(-1) || null,
      }, { transaction });
      await row.destroy({ transaction });
    } else await row.update({ inventory_id: targetId }, { transaction });
  }
  for (const model of [InventoryBatch, InventoryTransaction]) {
    await model.update({ inventory_id: targetId }, { where: { inventory_id: sourceId }, transaction });
  }
  const plans = await RestockPlan.findAll({ where: { inventory_id: sourceId }, transaction });
  for (const plan of plans) {
    const target = await RestockPlan.findOne({ where: { inventory_id: targetId, item_id: plan.item_id, month: plan.month, year: plan.year }, transaction });
    if (!target) await plan.update({ inventory_id: targetId }, { transaction });
    else {
      await target.update({ quantity_needed: Number(target.quantity_needed) + Number(plan.quantity_needed),
        is_cleared: target.is_cleared && plan.is_cleared,
        last_consumed_at: [target.last_consumed_at, plan.last_consumed_at].sort().at(-1),
      }, { transaction });
      await plan.destroy({ transaction });
    }
  }
}

export async function saveInventory(req, res) {
  try {
    const name = String(req.body.name || '').trim();
    const ids = req.body.hostel_ids;
    const mode = req.body.billing_mode;
    if (mode !== undefined && !['hostel', 'shared'].includes(mode)) throw new Error('Choose a valid consumption and billing mode.');
    if (req.body.effective_month && !/^\d{4}-\d{2}$/.test(req.body.effective_month)) throw new Error('Choose a valid effective month (YYYY-MM).');
    const effective = req.body.effective_month ? `${req.body.effective_month}-01` : `${schoolToday().slice(0, 7)}-01`;
    datePeriod(effective);
    if (Number(effective.slice(0, 4)) < 1900 || Number(effective.slice(0, 4)) > 2100) throw new Error('Choose an effective billing year from 1900 to 2100.');
    if (!name || name.length > 150) throw new Error('Enter an inventory name of 1–150 characters.');
    if (!Array.isArray(ids) || !ids.length || ids.some(id => !Number.isInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
      throw new Error('Select one or more distinct hostels for this inventory.');
    }
    const result = await sequelize.transaction(async transaction => {
      // Same lock order for competing assignments; inventoryScope locks a pool
      // before touching its balances, so assignments cannot race a stock write.
      await Inventory.findAll({ order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
      const selected = await Hostel.findAll({ where: { id: { [Op.in]: ids } }, transaction, lock: transaction.LOCK.UPDATE });
      if (selected.length !== ids.length) throw new Error('One or more selected hostels do not exist.');
      const inventory = req.params.id ? await Inventory.findByPk(req.params.id, { transaction }) : null;
      if (req.params.id && !inventory) throw new Error('Inventory not found.');
      const assignments = await InventoryHostel.findAll({ transaction, lock: transaction.LOCK.UPDATE });
      if (inventory && assignments.some(row => row.inventory_id === inventory.id && !ids.includes(row.hostel_id))) {
        throw new Error('To remove a hostel, assign it to another inventory. Stock remains with its current inventory unless its entire hostel group moves.');
      }
      const target = inventory || await Inventory.create({ name }, { transaction });
      const sources = [...new Set(assignments.filter(row => ids.includes(row.hostel_id) && row.inventory_id !== target.id).map(row => row.inventory_id))];
      const currentStart = `${schoolToday().slice(0, 7)}-01`;
      const oldIds = assignments.filter(row => row.inventory_id === target.id).map(row => row.hostel_id);
      const rosterChanged = oldIds.length !== ids.length || ids.some(id => !oldIds.includes(id));
      const policy = await inventoryPolicy(target.id, schoolToday(), transaction);
      const nextMode = mode || (inventory ? policy.mode : 'shared');
      const effectivePolicy = await inventoryPolicy(target.id, effective, transaction);
      if (effective < currentStart) {
        if (!inventory || rosterChanged) throw new Error('Earlier billing months can only change the mode of an existing inventory with unchanged hostel assignments.');
        // An inserted policy lasts until the next policy, not just its first month.
        const following = await InventoryBillingPolicy.findOne({ where: { inventory_id: target.id, effective_from: { [Op.gt]: effective } }, order: [['effective_from', 'ASC']], transaction });
        for (let month = effective; month <= currentStart && (!following || month < following.effective_from);) {
          const previous = await inventoryPolicy(target.id, month, transaction);
          const sameRoster = previous.hostel_ids.length === ids.length && ids.every(id => previous.hostel_ids.includes(id));
          if (!sameRoster) throw new Error(`Hostel assignments differ in ${month.slice(0, 7)}. Historical group membership cannot be changed here.`);
          if (previous.mode !== nextMode && await hasPeriodActivity(target.id, ids, month, transaction)) {
            throw new Error(`${month.slice(0, 7)} already has consumption, expenses, meal entries, or finalized bills. Choose an unused billing period.`);
          }
          const cursor = new Date(`${month}T00:00:00Z`);
          cursor.setUTCMonth(cursor.getUTCMonth() + 1);
          month = cursor.toISOString().slice(0, 10);
        }
      }
      if (nextMode !== effectivePolicy.mode && await hasPeriodActivity(target.id, [...new Set([...effectivePolicy.hostel_ids, ...ids])], effective, transaction)) {
        throw new Error('The effective month already has activity or finalized bills. Choose a later unused month.');
      }
      if (rosterChanged && effective > currentStart) throw new Error('Assign hostels for the current month first, then schedule a future billing-mode change separately.');
      for (const poolId of [target.id, ...sources]) {
        const current = await inventoryPolicy(poolId, schoolToday(), transaction);
        const pending = await InventoryBillingPolicy.count({ where: { inventory_id: poolId, effective_from: { [Op.gt]: currentStart } }, transaction });
        if (rosterChanged && pending) throw new Error('A future billing policy is scheduled for an affected inventory. Keep its hostel assignments unchanged.');
        if ((rosterChanged && current.mode === 'shared' || poolId === target.id && nextMode !== policy.mode && effective === currentStart)
          && await hasPeriodActivity(poolId, [...new Set([...current.hostel_ids, ...ids])], currentStart, transaction)) {
          throw new Error('This month already has activity or finalized bills. Schedule the billing mode for a future month. Shared-group membership must stay fixed once activity begins.');
        }
      }
      const mergeSources = sources.filter(id => assignments.filter(row => row.inventory_id === id).every(row => ids.includes(row.hostel_id)));
      if (mergeSources.length && req.body.combine_stock !== true) {
        throw new Error('Confirm combining existing inventory stock before moving these hostel groups.');
      }
      for (const source of mergeSources) await combineStock(source, target.id, transaction);
      for (const hostel_id of ids) await InventoryHostel.upsert({ hostel_id, inventory_id: target.id }, { transaction });
      if (rosterChanged || nextMode !== policy.mode || req.body.effective_month) {
        await InventoryBillingPolicy.upsert({ inventory_id: target.id, effective_from: effective, mode: nextMode, hostel_ids: ids, created_by: req.user.userId }, { transaction });
      }
      for (const source of sources) {
        const previous = await inventoryPolicy(source, schoolToday(), transaction);
        await InventoryBillingPolicy.upsert({ inventory_id: source, effective_from: currentStart, mode: previous.mode,
          hostel_ids: assignments.filter(row => row.inventory_id === source && !ids.includes(row.hostel_id)).map(row => row.hostel_id), created_by: req.user.userId }, { transaction });
      }
      await target.update({ name, description: String(req.body.description || '').trim() || null }, { transaction });
      return { id: target.id, name: target.name, combined_inventories: mergeSources.length };
    });
    res.status(req.params.id ? 200 : 201).json({ success: true, data: result });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
