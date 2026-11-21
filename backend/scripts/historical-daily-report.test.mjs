import test from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import ExcelJS from 'exceljs';
import { Op } from 'sequelize';
import { Hostel, Inventory, InventoryHostel, Enrollment, MessBillingSnapshot } from '../models/index.js';
import { InventoryBillingPolicy } from '../models/inventoryBilling.js';
import { HistoricalBilling } from '../utils/historicalBilling.js';
import { historicalDailyReport } from '../services/historicalDailyReport.js';
import { generateDailyRateReport } from '../controllers/dailyRateReportController.js';
import { mergeWorkspaceValues } from '../middleware/adminWorkspace.js';
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
  t.mock.method(HistoricalBilling, 'findOne', async ({ where }) => sources.find(row => row.hostel_id === where.hostel_id) || null);
  t.mock.method(Hostel, 'findAll', async options => options?.where?.id
    ? hostels.filter(hostel => options.where.id[Op.in].includes(hostel.id)) : hostels);
  t.mock.method(Inventory, 'findByPk', async () => ({ id: 10 }));
  t.mock.method(Hostel, 'findByPk', async id => hostels.find(hostel => hostel.id === id) || null);
  t.mock.method(InventoryHostel, 'findAll', async () => [{ hostel_id: 1, inventory_id: 10 }, { hostel_id: 2, inventory_id: 10 }]);
  t.mock.method(InventoryHostel, 'findByPk', async () => null);
  t.mock.method(Enrollment, 'findAll', async () => { throw new Error('Historical report must not recalculate enrollment days'); });
}

function savedCalculation(month, totalManDays = 0) {
  const subTotal = 10 * totalManDays;
  return {
    billing: { start: `2026-${month}-01`, byStudent: [] }, expenses: [{ name: 'Rice', amount: subTotal }],
    subTotal, totalDeductions: 0, totalExpenses: subTotal, foodExpenses: subTotal, totalManDays,
    dailyRate: totalManDays ? 10 : 0, waterRate: 0, waterTotal: 0, totalBaseDays: totalManDays,
    totalReductionDays: 0, studentManDaysMap: {},
    deductions: { cashToken: { amount: 0 }, creditToken: { amount: 0, description: '' },
      specialOrders: { amount: 0 }, guestIncome: { amount: 0 } }
  };
}
function response() {
  const chunks = [];
  const res = new Writable({ write(chunk, encoding, callback) { chunks.push(Buffer.from(chunk)); callback(); } });
  res.code = 200;
  res.status = code => { res.code = code; return res; };
  res.json = body => { res.body = body; return res; };
  res.headers = {};
  res.setHeader = (key, value) => { res.headers[key] = value; return res; };
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
  await generateDailyRateReport(request(), res);
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
  const snapshot = t.mock.method(MessBillingSnapshot, 'findOne', async () => ({
    payload: { calculation: savedCalculation('08'), data: [] }
  }));
  const res = response();
  await generateDailyRateReport(request(null), res);
  assert.equal(res.code, 200, res.body?.message);
  assert.deepEqual(res.body.hostelSummaries.map(row => row.hostel_id), [1, 3]);
  assert.deepEqual(snapshot.mock.calls.map(call => call.arguments[0].where.hostel_id), [3]);
  assert.equal(res.body.data.totalManDays, 13837);
  assert.equal(res.body.data.dailyRate, 92.98);
  assert.equal(res.body.data.subTotal, daily.subTotal);
});

test('historical export includes shared coverage and approved figures', async t => {
  fixtures(t);
  const res = response();
  await generateDailyRateReport(request('10', { export: 'true' }), res);
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
  const calculation = savedCalculation('10', 10);
  const snapshot = t.mock.method(MessBillingSnapshot, 'findOne', async () => ({
    payload: { calculation, data: [] }
  }));
  const res = response();
  await generateDailyRateReport(request('10', { month: '10' }), res);
  assert.equal(res.code, 200, res.body?.message);
  assert.deepEqual(snapshot.mock.calls.map(call => call.arguments[0].where.hostel_id), [1, 2, 3]);
  const { billing, ...data } = calculation;
  assert.deepEqual(res.body.data, mergeWorkspaceValues(hostels.map(() => ({ ...data, finalized: true }))));
});

test('all-hostel Excel export includes a complete sheet for each report scope', async t => {
  fixtures(t);
  t.mock.method(MessBillingSnapshot, 'findOne', async () => ({ payload: { calculation: savedCalculation('08'), data: [] } }));
  const res = response();
  await generateDailyRateReport(request(null, { export: 'true' }), res);
  assert.equal(res.code, 200, res.body?.message);
  assert.equal(res.headers['Content-Disposition'], 'attachment; filename=All-Hostels-Report.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(res.buffer());
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['1 August 2026 Daily Rate', '3 Daily Rate Calculation']);
  assert.ok(workbook.worksheets[0].getSheetValues().some(row => row?.[1] === 'Approved daily rate' && row[2] === 92.98));
  const operational = workbook.worksheets[1];
  assert.equal(operational.getCell('A1').value, 'Girls Hostel, K.R.Nagar');
  assert.equal(operational.getCell('B1').master.address, 'A1');
  assert.equal(operational.getCell('A1').font.bold, true);
});

test('staff workspace and selected inventory enforce the prior scope rules', async t => {
  fixtures(t);
  const staffWorkspace = { role: 'mess', hostel: hostels[1], inventory: { id: 10 } };
  for (const [req, status, message] of [
    [{ ...request('10'), staffWorkspace: { ...staffWorkspace, role: 'warden' } }, 403, /matching staff workspace/],
    [{ ...request('10', { hostel_id: '1' }), staffWorkspace }, 403, /belongs to another hostel/],
    [{ ...request('20'), staffWorkspace }, 403, /inventory belongs to another workspace/],
    [{ ...request('10'), staffWorkspace: { ...staffWorkspace, inventory: null } }, 409, /Assign an inventory/],
    [request('10', { hostel_id: '3' }), 400, /selected hostel does not use this inventory/]
  ]) {
    const res = response();
    await generateDailyRateReport(req, res);
    assert.equal(res.code, status);
    assert.match(res.body.message, message);
  }
  assert.equal(HistoricalBilling.findAll.mock.callCount(), 0);
  const req = { ...request('10'), staffWorkspace, user: { role: 'admin', userId: 99, hostel_id: null } };
  const res = response();
  await generateDailyRateReport(req, res);
  assert.equal(res.code, 200, res.body?.message);
  assert.deepEqual(req.user, { role: 'admin', userId: 99, hostel_id: null });
  assert.equal(res.body.data.dailyRate, 92.98);
});
