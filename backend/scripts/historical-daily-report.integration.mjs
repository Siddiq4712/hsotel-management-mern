// Read-only verification against local August data. No bill generation or emails.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Writable } from 'node:stream';
import ExcelJS from 'exceljs';
import { sequelize, initAssociations, InventoryHostel, MessBill, MessBillingSnapshot, DailyRateLog } from '../models/index.js';
import { HistoricalBilling } from '../utils/historicalBilling.js';
import { generateDailyRateReport } from '../controllers/messController.js';
import { installAdminWorkspace } from '../middleware/adminWorkspace.js';
import { inventoryReport } from '../controllers/inventoryReportController.js';

initAssociations();
const where = { month: 8, year: 2026 };
async function financialState() {
  const tables = await Promise.all([HistoricalBilling, MessBill, MessBillingSnapshot, DailyRateLog].map(model =>
    model.findAll({ where, order: [[model.primaryKeyAttribute, 'ASC']], raw: true })));
  return crypto.createHash('sha256').update(JSON.stringify(tables)).digest('hex');
}
function response() {
  const chunks = [];
  const res = new Writable({ write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
  res.code = 200;
  res.status = code => { res.code = code; return res; };
  res.json = value => { res.body = value; return res; };
  res.setHeader = () => res;
  res.buffer = () => Buffer.concat(chunks);
  return res;
}
function check(res) {
  assert.equal(res.code, 200, res.body?.message);
  assert.equal(res.body.historicalImport, true);
  assert.equal(res.body.data.totalManDays, 13837);
  assert.equal(res.body.data.dailyRate, 92.98);
  assert.equal(res.body.data.totalDeductions, 517496);
  assert.ok(Math.abs(res.body.data.totalExpenses - 1286562.6199778887) < 0.001);
  assert.deepEqual(res.body.data.coveredHostelIds.map(Number).sort(), [1, 2]);
}
try {
  const before = await financialState();
  for (const id of [1, 2]) {
    const res = response();
    await generateDailyRateReport({ query: where, user: { hostel_id: id } }, res);
    check(res);
    console.log(`Hostel ${id}: shared August report passed`);
  }
  const routes = {};
  const router = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method,
    (path, ...handlers) => { routes[`${method} ${path}`] = handlers.at(-1); }]));
  installAdminWorkspace(router, 'mess');
  router.get('/reports/daily-rate-calculation', generateDailyRateReport);
  const route = routes['get /reports/daily-rate-calculation'];
  const inventory = await InventoryHostel.findByPk(2);
  const preview = response();
  await inventoryReport({ user: { role: 'admin' }, params: { id: String(inventory.inventory_id) },
    query: { ...where, kind: 'rate', format: 'preview' } }, preview);
  assert.equal(preview.code, 200, preview.body?.message);
  assert.equal(preview.body.data.summary.dailyRate, 92.98);
  assert.equal(preview.body.data.summary.totalManDays, 13837);
  assert.equal(preview.body.data.summary.historicalImport, true);
  assert.equal(preview.body.data.scope.hostels.length, 2);
  assert.ok(Math.abs(preview.body.data.summary.foodExpenses - 1286562.6199778887) < 0.001);
  console.log('Active inventory daily-rate preview endpoint: both boys hostels, 13837 days, rate 92.98');
  const request = (selected, extra = {}) => ({ user: { role: 'admin' }, params: {}, body: {}, query: { ...where, ...extra },
    get: key => key === 'X-Inventory-Id' && selected ? String(inventory.inventory_id) : undefined });
  for (const selected of [true, false]) {
    const res = response();
    await route(request(selected), res);
    check(res);
    console.log(`${selected ? 'Selected inventory' : 'All hostels'}: August totals counted once`);
  }
  const exported = response();
  await route(request(true, { export: 'true' }), exported);
  if (!exported.writableFinished) await new Promise(resolve => exported.once('finish', resolve));
  assert.equal(exported.code, 200, exported.body?.message);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(exported.buffer());
  assert.equal(workbook.worksheets.length, 1);
  const values = workbook.worksheets[0].getSheetValues();
  assert.ok(values.some(row => row?.[1] === 'Approved daily rate' && row[2] === 92.98));
  assert.ok(values.some(row => row?.[1] === 'Man-days' && row[2] === 13837));
  assert.ok(values.some(row => row?.[1] === 'Hostels covered' && /1.*2/.test(row[2])));
  assert.equal(await financialState(), before, 'August financial records must remain unchanged');
  console.log('Excel export passed; August historical statements, bills, snapshots and rate logs unchanged.');
} finally {
  await sequelize.close();
}
