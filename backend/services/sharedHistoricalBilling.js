import { Op } from 'sequelize';
import { HistoricalBilling } from '../utils/historicalBilling.js';
import { DailyConsumption, MessDailyExpense, AdditionalIncome, FoodOrder, MessBill, MessBillingSnapshot } from '../models/index.js';
import { getBillingDays, billingMonth } from './billingDays.js';
import { policyError } from './inventoryBilling.js';

// Approved imports retain their original days, rounding and water treatment.
// An empty member may join that historical scope without recalculating any bill.
export async function sharedHistoricalCalculation(policy, hostelId, month, year, transaction) {
  if (policy.mode !== 'shared' || Number(month) !== 8 || Number(year) !== 2026) return null;
  const sources = await HistoricalBilling.findAll({ where: { hostel_id: { [Op.in]: policy.hostel_ids }, month, year }, transaction });
  if (!sources.length) return null;
  if (sources.length !== 1) throw policyError('Multiple approved historical statements require a reviewed shared-billing adjustment.');
  const source = sources[0], payload = source.payload, period = billingMonth(month, year);
  const otherIds = policy.hostel_ids.filter(id => id !== source.hostel_id);
  const range = { [Op.between]: [period.start, period.end] };
  const otherScope = { [Op.or]: [{ hostel_id: { [Op.in]: otherIds } }, { inventory_id: policy.inventory_id, hostel_id: null }] };
  const hasExtra = await DailyConsumption.count({ where: { ...otherScope, consumption_date: range }, transaction })
    || await MessDailyExpense.count({ where: { ...otherScope, expense_date: range }, transaction })
    || await AdditionalIncome.count({ where: { hostel_id: { [Op.in]: otherIds }, received_date: range }, transaction })
    || await FoodOrder.count({ where: { hostel_id: { [Op.in]: otherIds }, order_date: range }, transaction })
    || await MessBill.count({ where: { hostel_id: { [Op.in]: otherIds }, month, year }, transaction })
    || await MessBillingSnapshot.count({ where: { hostel_id: { [Op.in]: otherIds }, month, year }, transaction });
  if (hasExtra) throw policyError('Additional historical activity requires a reviewed adjustment before combining approved bills.');
  for (const id of otherIds) {
    const days = await getBillingDays(id, month, year, transaction);
    if (days.totalManDays) throw policyError('Additional historical billable days require a reviewed adjustment before combining approved bills.');
  }
  const bills = await MessBill.findAll({ where: { hostel_id: source.hostel_id, month, year }, transaction });
  if (bills.length !== payload.rows.length || bills.some(bill => {
    const row = payload.rows.find(row => String(row.studentId) === String(bill.student_id));
    return !row || Number(row.finalAmount) !== Number(bill.amount);
  })) throw policyError('Historical bills differ from the approved import. Review them before combining this period.');
  const ownRows = Number(hostelId) === source.hostel_id ? payload.rows : [];
  const byStudent = new Map(ownRows.map(row => [String(row.studentId), { baseDays: null, approvedReductionDays: null, billableDays: row.messDays, billableDates: [], reductionDates: [] }]));
  const daily = payload.daily;
  const totalManDays = Number(daily.totalManDays);
  return {
    billing: { ...period, byStudent, totalManDays: ownRows.reduce((sum, row) => sum + Number(row.messDays), 0), totalBaseDays: 0, totalReductionDays: 0, operationalDays: null },
    frozenRows: ownRows.map(row => ({ ...row, waterCharges: 0, baseDays: null, approvedReductionDays: null })),
    finalized: true, historicalImport: true, billingMode: 'shared', inventoryId: policy.inventory_id,
    expenses: daily.expenses, subTotal: daily.subTotal, deductions: daily.deductions, totalDeductions: daily.totalDeductions,
    totalExpenses: daily.totalExpenses, foodExpenses: daily.totalExpenses, dailyRate: daily.dailyRate,
    totalManDays, totalBaseDays: 0, totalReductionDays: 0, waterTotal: 0, waterRate: 0, studentManDaysMap: {},
    sharedSummary: { inventoryId: policy.inventory_id, hostelIds: policy.hostel_ids, totalManDays, totalBaseDays: 0,
      grossExpenses: daily.subTotal, deductions: daily.totalDeductions, foodExpenses: daily.totalExpenses, waterTotal: 0, dailyRate: daily.dailyRate },
  };
}
