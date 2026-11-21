import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import ExcelJS from 'exceljs';
import sequelize from '../config/database.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { exportUnitRateCalculation } from '../controllers/messController.js';

test('unit-rate export preserves the inventory query scope, worksheet values and totals', async t => {
  t.mock.method(InventoryHostel, 'findByPk', async id => {
    assert.equal(id, 2);
    return { inventory_id: 10 };
  });
  t.mock.method(Inventory, 'findByPk', async id => {
    assert.equal(id, 10);
    return { id, name: 'Boys Inventory' };
  });
  t.mock.method(sequelize, 'query', async (sql, { replacements }) => {
    if (sql.includes('tbl_HistoricalMessInputs')) {
      assert.deepEqual(replacements, { inventoryId: 10, month: '7', year: '2026' });
      return [];
    }
    assert.deepEqual(replacements, {
      inventory_id: 10, startOfMonth: '2026-07-01 00:00:00',
      endOfMonth: '2026-07-31 23:59:59', previousMonthEnd: '2026-06-30 23:59:59'
    });
    return [
      { item_name: 'Rice', unit_abbreviation: 'kg', opening_qty: '12.5', old_unit_rate: '40',
        purchase_qty: '8', last_unit_price: '45', purchase_amount: '365' },
      { item_name: 'Oil', purchase_qty: '2', last_unit_price: '100', purchase_amount: '200' }
    ];
  });
  const chunks = [];
  const headers = {};
  const res = new Writable({ write(chunk, encoding, done) { chunks.push(Buffer.from(chunk)); done(); } });
  res.setHeader = (name, value) => { headers[name] = value; };
  res.status = status => { assert.fail(`Unexpected response status ${status}`); };
  await exportUnitRateCalculation({ user: { hostel_id: 2 }, query: { month: '7', year: '2026' } }, res);

  assert.equal(headers['Content-Disposition'], 'attachment; filename="UnitRateCalculation_JULY 2026.xlsx"');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.concat(chunks));
  const sheet = workbook.getWorksheet('Unit Rate Calculation');
  assert.equal(sheet.getCell('A1').value, 'NATIONAL ENGINEERING COLLEGE — Boys Inventory');
  assert.equal(sheet.getCell('J2').master.address, 'A2');
  assert.deepEqual(sheet.getRow(6).values.slice(1), [1, 'Rice (kg)', 12.5, 40, 500, 8, 45, 365, 20.5, 865]);
  assert.equal(sheet.getCell('B8').value, 'Grand Total');
  assert.equal(sheet.getCell('I8').value, 22.5);
  assert.equal(sheet.getCell('J8').value, 1065);
  assert.equal(sheet.getCell('J8').numFmt, '0.00');
});
