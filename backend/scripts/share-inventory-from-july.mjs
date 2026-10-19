// Explicit, reviewed transition for the existing Boys Hostel inventory.
// Default is a rolled-back preview; --apply commits only the July policy.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { initAssociations, Hostel, MessBill, MessBillingSnapshot, MessDailyExpense, DailyConsumption, DailyRateLog } from '../models/index.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { InventoryBillingPolicy } from '../models/inventoryBilling.js';
import { HistoricalBilling } from '../utils/historicalBilling.js';
import { inventoryPolicy } from '../services/inventoryBilling.js';
import { buildMonthlyMessReport } from '../services/monthlyMessReport.js';
import { getMessCalculation } from '../services/messCalculation.js';

initAssociations();
const apply = process.argv.includes('--apply');
const transaction = await sequelize.transaction();
try {
  const pool = await Inventory.findByPk(10, { transaction, lock: transaction.LOCK.UPDATE });
  assert.equal(pool?.name, 'Boys Hostel Inventory');
  const members = await InventoryHostel.findAll({ where: { inventory_id: 10 }, transaction, lock: transaction.LOCK.UPDATE });
  assert.deepEqual(members.map(row => row.hostel_id).sort(), [1, 2]);
  await Hostel.findAll({ where: { id: [1, 2] }, transaction, lock: transaction.LOCK.UPDATE });
  const ledger = async () => {
    const data = {};
    for (const model of [MessBill, MessBillingSnapshot, MessDailyExpense, DailyConsumption, DailyRateLog, HistoricalBilling]) {
      data[model.name] = await model.findAll({ where: { hostel_id: [1, 2] }, order: [['id', 'ASC']], raw: true, transaction });
    }
    return data;
  };
  const before = await ledger();
  const priorPolicies = await InventoryBillingPolicy.findAll({ where: { inventory_id: 10 }, raw: true, transaction });
  const source = before.HistoricalBilling.find(row => row.hostel_id === 2 && row.month === 8 && row.year === 2026);
  assert(source, 'Approved August import is required');
  assert.equal(source.payload.rows.length, 537);
  assert.equal(source.payload.daily.totalManDays, 13837);
  const oldAugust = before.MessBill.filter(row => row.month === 8 && row.year === 2026);
  assert.equal(oldAugust.length, 537);
  const originalJune = await inventoryPolicy(10, '2026-06-01', transaction);
  await InventoryBillingPolicy.upsert({ inventory_id: 10, effective_from: '2026-07-01', mode: 'shared', hostel_ids: [1, 2], created_by: null }, { transaction });
  const months = [];
  for (const month of [7, 8, 9, 10]) {
    const first = await getMessCalculation(1, month, 2026, transaction);
    const second = await getMessCalculation(2, month, 2026, transaction);
    assert.equal(first.billingMode, 'shared');
    assert.equal(second.billingMode, 'shared');
    assert.equal(first.dailyRate, second.dailyRate);
    months.push({ month, dailyRate: first.dailyRate, totalManDays: first.sharedSummary.totalManDays });
  }
  const reports = await Promise.all([1, 2].map(id => buildMonthlyMessReport(id, 8, 2026, null, transaction)));
  assert.equal(reports[0].data.length, 0);
  assert.equal(reports[1].data.length, 537);
  const comparison = oldAugust.map(bill => {
    const row = reports[1].data.find(row => String(row.studentId) === String(bill.student_id));
    assert(row, `Missing approved row for bill ${bill.id}`);
    assert.equal(row.finalAmount, Number(bill.amount));
    return { billId: bill.id, hostel: 'BOYS HOSTEL 2', studentId: bill.student_id, name: row.name, registerNumber: row.regNo,
      messDays: row.messDays, dailyRate: row.dailyRate, existingAmount: Number(bill.amount), sharedAmount: row.finalAmount, status: bill.status };
  });
  // Exercise the guard: new activity cannot silently reuse an approved import.
  const expense = before.MessDailyExpense.find(row => row.hostel_id === 2 && row.expense_date.startsWith('2026-08'));
  assert(expense);
  if (!apply) {
    const probe = await sequelize.transaction({ transaction });
    try {
      await MessDailyExpense.update({ hostel_id: 1 }, { where: { id: expense.id }, transaction: probe });
      await assert.rejects(() => getMessCalculation(1, 8, 2026, probe), /reviewed adjustment/);
    } finally { await probe.rollback(); }
  }
  assert.deepEqual(await ledger(), before, 'Bills, historical imports, expenses, and saved rates must remain identical');
  assert.deepEqual(await inventoryPolicy(10, '2026-06-01', transaction), originalJune);
  fs.mkdirSync('import-work/inventory-backups', { recursive: true });
  const output = { apply, inventory: pool.name, effectiveMonth: '2026-07', months, daily: source.payload.daily, sourceHash: source.source_hash, comparison };
  if (apply) {
    const backup = `import-work/inventory-backups/before-july-shared-applied-${Date.now()}.json`;
    fs.writeFileSync(backup, JSON.stringify({ inventory: pool.toJSON(), policies: priorPolicies, ledger: before }, null, 2));
    await transaction.commit();
    console.log(JSON.stringify({ applied: true, backup, unchangedBills: comparison.length, months }));
  } else {
    fs.writeFileSync('import-work/inventory-backups/july-shared-comparison.json', JSON.stringify(output, null, 2));
    await transaction.rollback();
    console.log(JSON.stringify({ preview: true, unchangedBills: comparison.length, months }));
  }
} catch (error) {
  if (!transaction.finished) await transaction.rollback();
  throw error;
} finally { await sequelize.close(); }
