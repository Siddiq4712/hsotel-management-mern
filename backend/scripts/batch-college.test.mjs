import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureBatchSchema } from '../services/batchSchema.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { InventoryBillingPolicy } from '../models/inventoryBilling.js';
import { withBatchInventory } from '../services/batchInventory.js';

test('college migration replaces the old unique key and reruns without changing enrollments', async () => {
  const columns = {
    tbl_Session: { gender: {}, erp_batch_year: {}, hostel_id: {} },
    tbl_users: { gender: {} }, tbl_Enrollment: { erp_batch_year: {} }
  };
  let indexes = [{ name: 'batch_erp_year_gender_unique' }, { name: 'batch_erp_year_unique' }];
  const changes = [];
  const query = {
    describeTable: async table => columns[table],
    addColumn: async (table, column, definition) => { columns[table][column] = definition; changes.push({ table, column, definition }); },
    showIndex: async () => indexes,
    addIndex: async (table, fields, options) => { indexes = [...indexes, options]; changes.push({ table, fields, options }); },
    removeIndex: async (table, name) => { indexes = indexes.filter(index => index.name !== name); changes.push({ table, removed: name }); }
  };
  const database = { getQueryInterface: () => query, query: async () => assert.fail('No historical records should be rewritten') };
  await ensureBatchSchema(database);
  assert.equal(columns.tbl_Session.college.defaultValue, 'nec');
  assert.equal(columns.tbl_Session.college.allowNull, false);
  assert.deepEqual(changes[1].fields, ['college', 'erp_batch_year', 'gender']);
  assert.equal(changes[1].options.unique, true);
  assert.deepEqual(indexes.map(index => index.name), ['batch_college_erp_year_gender_unique']);
  assert.equal(changes.some(change => change.table === 'tbl_Enrollment'), false);
  const count = changes.length;
  await ensureBatchSchema(database);
  assert.equal(changes.length, count);
});

test('batch previews show one shared inventory/rate for NEC and LAPC and respect effective policy dates', async () => {
  const saved = [Inventory.findAll, InventoryHostel.findAll, InventoryBillingPolicy.findAll];
  Inventory.findAll = async () => [{ id: 10, name: 'Boys Mess' }, { id: 20, name: 'Other Mess' }];
  InventoryHostel.findAll = async () => [{ hostel_id: 1, inventory_id: 10 }, { hostel_id: 8, inventory_id: 10 }, { hostel_id: 9, inventory_id: 20 }];
  InventoryBillingPolicy.findAll = async () => [
    { id: 3, inventory_id: 10, effective_from: '2099-01-01', mode: 'hostel', hostel_ids: [1, 8] },
    { id: 2, inventory_id: 10, effective_from: '2000-01-01', mode: 'shared', hostel_ids: [1, 8] },
    { id: 1, inventory_id: 20, effective_from: '2000-01-01', mode: 'hostel', hostel_ids: [9] }
  ];
  try {
    const batches = [{ college: 'nec', hostel_id: 1 }, { college: 'lapc', hostel_id: 8 }, { college: 'nec', hostel_id: 9 }, { college: 'lapc', hostel_id: 99 }];
    const rows = await withBatchInventory(batches);
    assert.deepEqual(rows.slice(0, 2).map(row => [row.inventory_id, row.inventory_name, row.billing_mode]), [[10, 'Boys Mess', 'shared'], [10, 'Boys Mess', 'shared']]);
    assert.equal(rows[0].billing_effective_from, '2000-01-01');
    assert.equal(rows[2].billing_mode, 'hostel');
    assert.equal(rows[3].inventory_id, null);
    assert.equal(batches[0].inventory_id, undefined, 'preview never changes stored batch rules');
    InventoryBillingPolicy.findAll = async () => [{ inventory_id: 10, effective_from: '2099-01-01', mode: 'shared', hostel_ids: [1, 8] }];
    assert.equal((await withBatchInventory(batches))[1].billing_mode, 'hostel', 'future shared policy is not current');
  } finally { [Inventory.findAll, InventoryHostel.findAll, InventoryBillingPolicy.findAll] = saved; }
});
