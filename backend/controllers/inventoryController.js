import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Hostel, ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption } from '../models/index.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';

export async function listInventories(req, res) {
  try {
    const assignments = await InventoryHostel.findAll({ raw: true });
    const allowed = req.user.role === 'admin' ? null : assignments.find(row => row.hostel_id === req.user.hostel_id)?.inventory_id;
    const [inventories, hostels] = await Promise.all([
      Inventory.findAll({ ...(allowed === null ? {} : { where: { id: allowed || 0 } }), order: [['name', 'ASC']], raw: true }),
      Hostel.findAll({ attributes: ['id', 'name'], order: [['name', 'ASC']], raw: true }),
    ]);
    res.json({ success: true, data: inventories.map(inventory => ({ ...inventory,
      hostels: hostels.filter(hostel => assignments.some(row => row.hostel_id === hostel.id && row.inventory_id === inventory.id)),
    })) });
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
      for (const model of [ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption]) {
        if (await model.count({ where, transaction })) {
          throw Object.assign(new Error('This inventory has stock or history and cannot be deleted.'), { status: 409 });
        }
      }
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
      const mergeSources = sources.filter(id => assignments.filter(row => row.inventory_id === id).every(row => ids.includes(row.hostel_id)));
      if (mergeSources.length && req.body.combine_stock !== true) {
        throw new Error('Confirm combining existing inventory stock before moving these hostel groups.');
      }
      for (const source of mergeSources) await combineStock(source, target.id, transaction);
      for (const hostel_id of ids) await InventoryHostel.upsert({ hostel_id, inventory_id: target.id }, { transaction });
      await target.update({ name, description: String(req.body.description || '').trim() || null }, { transaction });
      return { id: target.id, name: target.name, combined_inventories: mergeSources.length };
    });
    res.status(req.params.id ? 200 : 201).json({ success: true, data: result });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
}
