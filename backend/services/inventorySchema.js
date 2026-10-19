import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { Hostel, ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption, MessDailyExpense } from '../models/index.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { InventoryBillingPolicy, InventoryMealEntry } from '../models/inventoryBilling.js';

export async function ensureInventorySchema() {
  await Inventory.sync();
  await InventoryHostel.sync();
  await InventoryBillingPolicy.sync();
  await InventoryMealEntry.sync();
  const query = sequelize.getQueryInterface();
  for (const model of [DailyConsumption, MessDailyExpense]) {
    await model.sync();
    const columns = await query.describeTable(model.getTableName());
    if (!columns.hostel_id.allowNull) await query.changeColumn(model.getTableName(), 'hostel_id', { type: DataTypes.INTEGER, allowNull: true });
    if (!columns.inventory_id) await query.addColumn(model.getTableName(), 'inventory_id', { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_Inventory', key: 'id' } });
  }
  for (const model of [ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption]) {
    await model.sync();
    const columns = await query.describeTable(model.getTableName());
    if (!columns.inventory_id) await query.addColumn(model.getTableName(), 'inventory_id', {
      type: DataTypes.INTEGER, allowNull: true,
      references: { model: 'tbl_Inventory', key: 'id' },
    });
    const indexes = await query.showIndex(model.getTableName());
    if (!indexes.some(index => index.name === 'inventory_item_lookup')) {
      await query.addIndex(model.getTableName(), ['inventory_id', 'item_id'], { name: 'inventory_item_lookup' });
    }
  }
  // Idempotent upgrade: preserve each hostel's existing stock as a separate
  // inventory. Administrators explicitly choose which pools to combine later.
  await sequelize.transaction(async transaction => {
    const hostels = await Hostel.findAll({ order: [['id', 'ASC']], transaction });
    for (const hostel of hostels) {
      let assignment = await InventoryHostel.findByPk(hostel.id, { transaction });
      if (!assignment) {
        const inventory = await Inventory.create({ name: `${hostel.name} Inventory` }, { transaction });
        assignment = await InventoryHostel.create({ hostel_id: hostel.id, inventory_id: inventory.id }, { transaction });
      }
      for (const model of [ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption]) {
        await model.update({ inventory_id: assignment.inventory_id }, {
          where: { hostel_id: hostel.id, inventory_id: null }, transaction,
        });
      }
    }
    const inventories = await Inventory.findAll({ transaction });
    for (const inventory of inventories) {
      if (!await InventoryBillingPolicy.count({ where: { inventory_id: inventory.id }, transaction })) {
        const members = await InventoryHostel.findAll({ where: { inventory_id: inventory.id }, transaction });
        await InventoryBillingPolicy.create({ inventory_id: inventory.id, effective_from: '1900-01-01', mode: 'hostel', hostel_ids: members.map(row => row.hostel_id) }, { transaction });
      }
    }
  });
}
