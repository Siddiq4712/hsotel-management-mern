import { InventoryBillingPolicy, InventoryMealEntry } from '../models/inventoryBilling.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption, MessDailyExpense } from '../models/index.js';
import { deleteInventory } from '../controllers/inventoryController.js';

test('deletes only an empty unassigned inventory, with no cascading loss of stock or history', async () => {
  const models = [InventoryHostel, ItemStock, InventoryBatch, InventoryTransaction, RestockPlan, DailyConsumption, MessDailyExpense, InventoryMealEntry];
  const originalPolicyCount = InventoryBillingPolicy.count;
  InventoryBillingPolicy.count = async () => 0;
  const originalDestroyPolicy = InventoryBillingPolicy.destroy;
  InventoryBillingPolicy.destroy = async () => 0;
  const original = { transaction: sequelize.transaction, find: Inventory.findByPk, counts: models.map(model => model.count) };
  let blockedModel, destroyed = 0, exists = true;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  sequelize.transaction = async callback => callback(transaction);
  Inventory.findByPk = async (id, options) => {
    assert.equal(id, 10); assert.equal(options.transaction, transaction); assert.equal(options.lock, 'UPDATE');
    return exists ? { destroy: async options => { assert.equal(options.transaction, transaction); destroyed++; } } : null;
  };
  for (const model of models) model.count = async options => {
    assert.deepEqual(options.where, { inventory_id: 10 }); assert.equal(options.transaction, transaction);
    return model === blockedModel ? 1 : 0;
  };
  const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
  try {
    for (const model of models) {
      blockedModel = model;
      const res = response(); await deleteInventory({ params: { id: '10' } }, res);
      assert.equal(res.statusCode, 409, `${model.name} must prevent deletion`);
      assert.equal(destroyed, 0);
    }
    blockedModel = null;
    const success = response(); await deleteInventory({ params: { id: '10' } }, success);
    assert.equal(success.statusCode, 200); assert.equal(destroyed, 1);
    exists = false;
    const missing = response(); await deleteInventory({ params: { id: '10' } }, missing);
    assert.equal(missing.statusCode, 404); assert.equal(destroyed, 1);
    const invalid = response(); await deleteInventory({ params: { id: 'all' } }, invalid);
    assert.equal(invalid.statusCode, 400); assert.equal(destroyed, 1);
  } finally {
    InventoryBillingPolicy.destroy = originalDestroyPolicy;
    InventoryBillingPolicy.count = originalPolicyCount;
    sequelize.transaction = original.transaction; Inventory.findByPk = original.find;
    models.forEach((model, index) => { model.count = original.counts[index]; });
  }
});
