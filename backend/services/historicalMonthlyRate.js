import { Op, fn, col, where as sqlWhere } from 'sequelize';
import sequelize from '../config/database.js';
import { Attendance, GPSAttendance, User, Hostel, MessDailyExpense, ExpenseType, AdditionalIncome, IncomeType,
  DailyConsumption, FoodOrder, MessBill, MessBillingSnapshot } from '../models/index.js';
import { billingMonth } from './billingDays.js';
import { hostelPolicy, policyError } from './inventoryBilling.js';

const sum = rows => rows.reduce((total, row) => total + Number(row.amount), 0);
const key = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
const check = (condition, message) => { if (!condition) throw policyError(`Historical monthly rate unavailable: ${message}`); };
const periodWhere = (field, period) => ({ [Op.and]: [
  sqlWhere(fn('YEAR', col(field)), period.year), sqlWhere(fn('MONTH', col(field)), period.month)
] });

// These three imported months have a different basis from live calendar billing.
// This reader never saves rates, creates bills, or invents individual attendance dates.
export async function historicalMonthlyRate(hostelId, month, year, transaction) {
  if (Number(year) !== 2026 || ![7, 8, 9].includes(Number(month))) return null;
  const period = billingMonth(month, year);
  const policy = await hostelPolicy(hostelId, period.start, transaction);
  if (!policy.inventory_id) return null;
  let archives;
  try {
    [archives] = await sequelize.query('SELECT * FROM tbl_HistoricalMessInputs WHERE inventory_id=:inventory AND month=:month AND year=:year', {
      replacements: { inventory: policy.inventory_id, month: period.month, year: period.year }, transaction
    });
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE') return null;
    throw error;
  }
  if (!archives.length) return null;
  check(archives.length === 1, 'multiple source records require review.');
  const archive = archives[0], payload = typeof archive.payload === 'string' ? JSON.parse(archive.payload) : archive.payload;
  check(Array.isArray(payload.students) && payload.students.length > 0, 'source resident rows are missing.');
  const ids = [...new Set(payload.students.filter(row => row.hostel_id).map(row => Number(row.hostel_id)))].sort((a, b) => a - b);
  if (!ids.includes(Number(hostelId))) return null;
  const unresolved = payload.students.filter(row => !row.student_id || !row.hostel_id);
  check(!unresolved.length, `${unresolved.length} resident identities (${unresolved.reduce((s, r) => s + Number(r.days), 0)} man-days) remain unresolved. Existing approved statements are preserved.`);
  const expected = new Map();
  for (const row of payload.students) {
    check(Number.isInteger(Number(row.days)) && Number(row.days) >= 0 && Number(row.days) <= period.dates.length, 'a source monthly total is invalid.');
    const id = String(row.student_id);
    check(!expected.has(id), 'multiple source rows map to one resident.');
    expected.set(id, row);
  }
  check([...expected.values()].reduce((s, row) => s + Number(row.days), 0) === Number(archive.total_man_days), 'source attendance controls disagree.');
  const hosts = { hostel_id: { [Op.in]: ids } };
  const financialScope = { [Op.or]: [hosts, { inventory_id: archive.inventory_id, hostel_id: null }] };
  const [attendance, dailyCount, gpsCount, users, expenses, income, consumptionCount, orderCount, billCount, snapshotCount, hostels] = await Promise.all([
    Attendance.findAll({ where: { ...hosts, is_monthly: true, ...periodWhere('date', period) }, raw: true, transaction }),
    Attendance.count({ where: { ...hosts, is_monthly: false, ...periodWhere('date', period) }, transaction }),
    GPSAttendance.count({ where: { ...hosts, ...periodWhere('attendance_date', period) }, transaction }),
    User.findAll({ where: { userId: { [Op.in]: [...expected.keys()] } }, attributes: ['userId', 'roll_number'], raw: true, transaction }),
    MessDailyExpense.findAll({ where: { ...financialScope, ...periodWhere('expense_date', period) }, include: [{ model: ExpenseType, as: 'ExpenseType' }], transaction }),
    AdditionalIncome.findAll({ where: { ...hosts, ...periodWhere('received_date', period) }, include: [{ model: IncomeType, as: 'IncomeType' }], transaction }),
    DailyConsumption.count({ where: { ...financialScope, ...periodWhere('consumption_date', period) }, transaction }),
    FoodOrder.count({ where: { ...hosts, status: { [Op.ne]: 'cancelled' }, ...periodWhere('requested_time', period) }, transaction }),
    MessBill.count({ where: { ...hosts, month: period.month, year: period.year }, transaction }),
    MessBillingSnapshot.count({ where: { ...hosts, month: period.month, year: period.year }, transaction }),
    Hostel.findAll({ where: { id: { [Op.in]: ids } }, attributes: ['id', 'name'], order: [['id', 'ASC']], raw: true, transaction })
  ]);
  check(!billCount && !snapshotCount, 'finalized bills require their approved statement, not a recalculation.');
  check(!dailyCount && !gpsCount, 'daily attendance overlaps the monthly source; reconcile it before calculating.');
  check(!consumptionCount && !orderCount, 'additional consumption or food orders require source deduplication.');
  check(attendance.length === expected.size, 'monthly attendance rows do not match the source roster.');
  const byStudent = new Map(), usersById = new Map(users.map(user => [String(user.userId), user]));
  for (const row of attendance) {
    const id = String(row.student_id), source = expected.get(id), user = usersById.get(id);
    check(source && user && !byStudent.has(id), 'a monthly attendance identity is missing or duplicated.');
    check(String(user.roll_number || '') === String(source.roll || ''), 'a source roll no longer matches its resident account.');
    check(Number(row.hostel_id) === Number(source.hostel_id) && Number(row.totalManDays) === Number(source.days), 'a resident monthly total or hostel differs from the reconciled source.');
    byStudent.set(id, { baseDays: null, approvedReductionDays: null, billableDays: Number(row.totalManDays), billableDates: [], reductionDates: [] });
  }
  // Check each category as well as the grand totals; offsetting changes must not pass.
  const validateCategories = (stored, original, name) => {
    check(Array.isArray(original), `${name} source categories are missing.`);
    const actual = new Map(), source = new Map();
    for (const row of stored) {
      const type = row.ExpenseType?.name || row.IncomeType?.name;
      check(type && Number.isFinite(Number(row.amount)), `${name} has an invalid category or amount.`);
      actual.set(key(type), (actual.get(key(type)) || 0) + Number(row.amount));
    }
    for (const row of original) source.set(key(row.name), (source.get(key(row.name)) || 0) + Number(row.amount));
    for (const category of new Set([...actual.keys(), ...source.keys()])) {
      check(Math.abs((actual.get(category) || 0) - (source.get(category) || 0)) < 0.01, `${name} category ${category} differs from the source.`);
    }
  };
  validateCategories(expenses, payload.expenses, 'expense');
  validateCategories(income, payload.deductions, 'deduction');
  const subTotal = sum(expenses), totalDeductions = sum(income), totalManDays = [...byStudent.values()].reduce((s, row) => s + row.billableDays, 0);
  check(Math.abs(subTotal - Number(archive.gross_expenses)) < 0.01 && Math.abs(totalDeductions - Number(archive.total_deductions)) < 0.01, 'financial control totals disagree.');
  check(totalManDays > 0 && totalManDays === Number(archive.total_man_days), 'the attendance denominator is incomplete.');
  const amount = name => sum(income.filter(row => key(row.IncomeType?.name) === key(name)));
  const deductions = { cashToken: { amount: amount('Cash Token') }, creditToken: { amount: amount('Sister Concern Bill') },
    specialOrders: { amount: amount('Student Additional Credit Token') }, guestIncome: { amount: amount('Student Guest Income') } };
  check(Math.abs(sum(Object.values(deductions)) - totalDeductions) < 0.01, 'an unsupported deduction category needs review.');
  const totalExpenses = subTotal - totalDeductions;
  const ownStudents = new Map([...byStudent].filter(([id]) => Number(expected.get(id).hostel_id) === Number(hostelId)));
  return { billing: { ...period, byStudent: ownStudents, totalManDays: [...ownStudents.values()].reduce((s, row) => s + row.billableDays, 0),
      totalBaseDays: null, totalReductionDays: null, operationalDays: null },
    expenses: payload.expenses.map(row => ({ name: row.name, amount: sum(expenses.filter(expense => key(expense.ExpenseType?.name) === key(row.name))) })),
    subTotal, deductions, totalDeductions, totalExpenses, foodExpenses: totalExpenses, totalManDays, dailyRate: totalExpenses / totalManDays,
    waterTotal: 0, waterRate: 0, waterIncluded: true, includedWaterTotal: sum(expenses.filter(row => /water/i.test(row.ExpenseType?.name || ''))), totalBaseDays: null, totalReductionDays: null,
    historicalImport: true, historicalMonthlySummary: true, rateOnly: true, billingMode: 'shared', inventoryId: Number(archive.inventory_id),
    coveredHostelIds: ids, scopeLabel: hostels.map(hostel => hostel.name).join(' + '), month: period.month, year: period.year,
    studentManDaysMap: Object.fromEntries([...ownStudents].map(([id, row]) => [id, row.billableDays])),
    sharedSummary: { inventoryId: Number(archive.inventory_id), hostelIds: ids, totalManDays, totalBaseDays: null,
      grossExpenses: subTotal, deductions: totalDeductions, foodExpenses: totalExpenses, waterTotal: 0, dailyRate: totalExpenses / totalManDays } };
}
