import { historicalDailyReport } from './historicalDailyReport.js';
import { getMessCalculation } from './messCalculation.js';

export async function loadDailyRateCalculation(hostelId, month, year, transaction) {
  const statement = await historicalDailyReport(hostelId, month, year, transaction);
  if (statement) return { statement };
  if (!month || !year) throw Object.assign(new Error('Month and year are required.'), { status: 400 });
  return { calculation: await getMessCalculation(hostelId, month, year, transaction) };
}

export async function loadDailyRateReport(hostelId, month, year) {
  const { statement, calculation } = await loadDailyRateCalculation(hostelId, month, year);
  if (statement) return { data: statement.daily, historicalImport: true, approvedStatement: true };

  const { billing, frozenRows, ...data } = calculation;
  return { data, historicalImport: Boolean(data.historicalImport), startDate: new Date(billing.start + 'T00:00:00Z') };
}

const totalFields = new Set([
  'subTotal', 'totalDeductions', 'totalExpenses', 'foodExpenses', 'totalManDays',
  'waterTotal', 'includedWaterTotal', 'totalBaseDays', 'totalReductionDays', 'inventoryId'
]);
const rateFields = new Set(['dailyRate', 'unroundedDailyRate', 'waterRate']);
const flagFields = new Set(['finalized', 'legacyFinalized', 'historicalImport', 'historicalMonthlySummary', 'rateOnly', 'waterIncluded']);
const sharedTotalFields = new Set([
  'inventoryId', 'totalManDays', 'totalBaseDays', 'grossExpenses', 'deductions', 'foodExpenses', 'waterTotal'
]);

function sum(values) {
  return Math.round(values.reduce((result, value) => result + value, 0) * 100) / 100;
}

function commonRate(values) {
  return values.every(value => Number(value) === Number(values[0])) ? values[0] : null;
}

function combineFields(rows, combine) {
  const fields = new Set(rows.flatMap(row => Object.keys(row)));
  return Object.fromEntries([...fields].map(field => {
    const values = rows.map(row => row[field]).filter(value => value != null);
    return [field, values.length ? combine(field, values) : null];
  }));
}

function combineDeductions(deductions) {
  return combineFields(deductions, (_name, rows) =>
    combineFields(rows, (field, values) => {
      if (field !== 'amount') return values[0];
      if (values.every(value => typeof value === 'number')) return sum(values);
      if (values.every(value => typeof value === 'string' && Number.isFinite(Number(value)))) {
        return values.reduce((total, value) => total + Number(value), 0).toFixed(2);
      }
      return values[0];
    }));
}

function combineData(reports) {
  const data = combineFields(reports, (field, values) => {
    if (totalFields.has(field)) return sum(values);
    if (flagFields.has(field)) return values.some(Boolean);
    if (rateFields.has(field)) return commonRate(values);
    if (field === 'expenses' || field === 'coveredHostelIds') return values.flat();
    if (field === 'deductions') return combineDeductions(values);
    if (field === 'studentManDaysMap') return combineFields(values, (_student, days) => sum(days));
    if (field === 'sharedSummary') return combineFields(values, (key, entries) => {
      if (sharedTotalFields.has(key)) return sum(entries);
      if (key === 'hostelIds') return entries.flat();
      if (key === 'dailyRate') return commonRate(entries);
      return entries[0];
    });
    return values[0];
  });
  if (Number(data.totalManDays) > 0 && typeof data.totalExpenses === 'number') {
    // Preserve the existing all-hostel display rate. Individual ledgers keep their own food rates.
    data.dailyRate = data.totalExpenses / data.totalManDays;
  }
  return data;
}

export function combineDailyRateReports(reports, historicalPeriod) {
  if (!reports.length) return { success: true, allHostels: true, hostelSummaries: [] };

  const populated = reports.filter(({ data }) => Number(data.totalManDays) || Number(data.subTotal));
  const approved = historicalPeriod && populated.length === 1 && populated[0].historicalImport;
  const data = approved ? populated[0].data : combineData(reports.map(report => report.data));
  return {
    success: true,
    data,
    historicalImport: reports.some(report => report.historicalImport),
    allHostels: true,
    hostelSummaries: reports.map(({ hostel, data: report }) => ({
      hostel_id: hostel.id,
      dailyRate: report.dailyRate,
      totalExpenses: report.totalExpenses,
      totalManDays: report.totalManDays
    }))
  };
}
