import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';
import { Hostel, Inventory, InventoryHostel, Enrollment } from '../models/index.js';
import { InventoryBillingPolicy } from '../models/inventoryBilling.js';
import { HistoricalBilling } from '../utils/historicalBilling.js';
import { historicalDailyReport } from '../services/historicalDailyReport.js';
import { generateDailyRateReport } from '../controllers/messController.js';
import { installAdminWorkspace } from '../middleware/adminWorkspace.js';
import sequelize from '../config/database.js';
import { inventoryReport } from '../controllers/inventoryReportController.js';

const policy = { inventory_id: 10, mode: 'shared', hostel_ids: [1, 2], effective_from: '2026-07-01' };
const hostels = [{ id: 1, name: 'Boys Hostel 1' }, { id: 2, name: 'Boys Hostel 2' }, { id: 3, name: 'Girls Hostel' }];
const daily = { expenses: [{ name: 'Imported expenses', amount: 1804058.6199778887 }],
  subTotal: 1804058.6199778887, totalDeductions: 517496, totalExpenses: 1286562.6199778887,
  totalManDays: 13837, dailyRate: 92.98,
  deductions: { cashToken: { amount: 4345 }, creditToken: { amount: 316815 }, specialOrders: { amount: 196336 }, guestIncome: { amount: 0 } } };
const payload = { daily, rows: [{ studentId: 100, messDays: 31 }], summary: { dailyRate: 92.98 } };

function fixtures(t, sources = [{ hostel_id: 2, payload }]) {
  t.mock.method(InventoryBillingPolicy, 'findAll', async () => [policy]);
  t.mock.method(InventoryBillingPolicy, 'findOne', async () => policy);
  t.mock.method(HistoricalBilling, 'findAll', async () => sources);
  t.mock.method(Hostel, 'findAll', async options => options?.where?.id
    ? hostels.filter(hostel => options.where.id[Op.in].includes(hostel.id)) : hostels);
  t.mock.method(Inventory, 'findByPk', async () => ({ id: 10 }));
  t.mock.method(InventoryHostel, 'findAll', async () => [{ hostel_id: 1, inventory_id: 10 }, { hostel_id: 2, inventory_id: 10 }]);
  t.mock.method(Enrollment, 'findAll', async () => { throw new Error('Historical report must not recalculate enrollment days'); });
}
function route(handler = generateDailyRateReport) {
  const routes = {};
  const router = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method,
    (path, ...handlers) => { routes[`${method} ${path}`] = handlers.at(-1); }]));
  installAdminWorkspace(router, 'mess');
  router.get('/reports/daily-rate-calculation', handler);
  return routes['get /reports/daily-rate-calculation'];
}
function response() {
  const chunks = [];
  const res = new Writable({ write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
  res.code = 200;
  res.status = code => { res.code = code; return res; };
  res.json = body => { res.body = body; return res; };
  res.setHeader = () => res;
  res.buffer = () => Buffer.concat(chunks);
  return res;
}
const request = (inventory = '10', extra = {}) => ({ user: { role: 'admin' }, params: {}, body: {},
  query: { month: '8', year: '2026', ...extra }, get: key => key === 'X-Inventory-Id' ? inventory : undefined });

test('both shared hostels read the same statement without recalculating student days', async t => {
  fixtures(t);
  for (const id of [1, 2]) {
    const report = await historicalDailyReport(id, 8, 2026);
    assert.deepEqual(report.daily.coveredHostelIds, [1, 2]);
    assert.equal(report.daily.scopeLabel, 'Boys Hostel 1 + Boys Hostel 2');
    for (const key of Object.keys(daily)) assert.deepEqual(report.daily[key], daily[key]);
    assert.equal(report.rows, payload.rows);
  }
  assert.equal(payload.daily.historicalImport, undefined, 'lookup must not modify the stored payload');
});

test('other periods skip historical scope lookup', async t => {
  fixtures(t);
  assert.equal(await historicalDailyReport(1, 9, 2026), null);
  assert.equal(await historicalDailyReport(1, 8, 2025), null);
  assert.equal(HistoricalBilling.findAll.mock.callCount(), 0);
});

test('ambiguous shared statements are rejected and missing statements fall back', async t => {
  fixtures(t, [{ hostel_id: 1, payload }, { hostel_id: 2, payload }]);
  await assert.rejects(historicalDailyReport(1, 8, 2026), /Multiple historical statements/);
  HistoricalBilling.findAll.mock.mockImplementation(async () => []);
  assert.equal(await historicalDailyReport(1, 8, 2026), null);
});

test('inventory report returns the approved group exactly once', async t => {
  fixtures(t);
  const res = response();
  await route()(request(), res);
  assert.equal(res.code, 200);
  assert.equal(res.body.historicalImport, true);
  assert.equal(res.body.data.totalManDays, 13837);
  assert.equal(res.body.data.dailyRate, 92.98);
  assert.deepEqual(res.body.data.expenses, daily.expenses);
});

test('active inventory preview uses the shared historical statement without building student bills', async t => {
  fixtures(t);
  let committed = false;
  t.mock.method(sequelize, 'transaction', async () => ({
    commit: async () => { committed = true; }, rollback: async () => { throw new Error('Unexpected rollback'); }
  }));
  const res = response();
  await inventoryReport({ user: { role: 'admin' }, params: { id: '10' },
    query: { month: 8, year: 2026, kind: 'rate', format: 'preview' } }, res);
  assert.equal(res.code, 200, res.body?.message);
  assert.equal(res.body.data.summary.dailyRate, 92.98);
  assert.equal(res.body.data.summary.totalManDays, 13837);
  assert.equal(res.body.data.summary.foodExpenses, daily.totalExpenses);
  assert.equal(res.body.data.summary.historicalImport, true);
  assert.equal(res.body.data.summary.finalized, true);
  assert.equal(res.body.data.summary.waterIsSeparate, false);
  assert.deepEqual(res.body.data.scope.hostels.map(hostel => hostel.id), [1, 2]);
  assert.equal(res.body.data.rows.length, 1);
  assert.equal(committed, true);
});

test('all-hostel report deduplicates the shared statement and preserves its rounded rate', async t => {
  fixtures(t);
  const visited = [];
  const handler = async (req, res) => {
    visited.push(req.user.hostel_id);
    if (req.user.hostel_id === 3) return res.json({ success: true, data: { totalManDays: 0, subTotal: 0, totalExpenses: 0, dailyRate: 0, expenses: [] } });
    return generateDailyRateReport(req, res);
  };
  const res = response();
  await route(handler)(request(null), res);
  assert.deepEqual(visited, [1, 3]);
  assert.equal(res.body.data.totalManDays, 13837);
  assert.equal(res.body.data.dailyRate, 92.98);
  assert.equal(res.body.data.subTotal, daily.subTotal);
});

test('historical export includes shared coverage and approved figures', async t => {
  fixtures(t);
  const res = response();
  await route()(request('10', { export: 'true' }), res);
  if (!res.writableFinished) await new Promise(resolve => res.once('finish', resolve));
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(res.buffer());
  assert.equal(workbook.worksheets.length, 1);
  const rows = workbook.worksheets[0].getSheetValues().filter(Boolean).map(row => row.slice(1));
  assert.ok(rows.some(row => row[0] === 'Hostels covered' && row[1] === 'Boys Hostel 1 + Boys Hostel 2'));
  assert.ok(rows.some(row => row[0] === 'Man-days' && row[1] === 13837));
  assert.ok(rows.some(row => row[0] === 'Approved daily rate' && row[1] === 92.98));
});

test('other months retain the existing report routing', async t => {
  fixtures(t);
  const visited = [];
  const res = response();
  await route(async (req, response) => {
    visited.push(req.user.hostel_id);
    return response.json({ success: true, data: { totalManDays: 10, totalExpenses: 100, dailyRate: 10 } });
  })(request('10', { month: '9' }), res);
  assert.deepEqual(visited, [1, 2, 3]);
  assert.equal(res.body.data.totalManDays, 30);
});
