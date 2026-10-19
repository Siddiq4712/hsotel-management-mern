import { Op } from 'sequelize';
import { DailyConsumption, MessDailyExpense, ExpenseType, AdditionalIncome, IncomeType, FoodOrder, MessBillingSnapshot, MessBill, DailyRateLog } from '../models/index.js';
import { getBillingDays, billingMonth } from './billingDays.js';
import { hostelPolicy } from './inventoryBilling.js';
import { sharedHistoricalCalculation } from './sharedHistoricalBilling.js';

// Every open-month report, rate, and bill uses these exact costs and approval-backed days.
async function getHostelCalculation(hostelId, month, year, transaction) {
  const period = billingMonth(month, year);
  const snapshot = await MessBillingSnapshot.findOne({where:{hostel_id:hostelId,month,year},transaction});
  if (snapshot) {
    const saved = snapshot.payload.calculation;
    return {...saved,billing:{...saved.billing,byStudent:new Map(saved.billing.byStudent)},frozenRows:snapshot.payload.data,finalized:true};
  }
  if (await MessBill.count({where:{hostel_id:hostelId,month,year},transaction})) {
    const rate = await DailyRateLog.findOne({where:{hostel_id:hostelId,month,year},transaction});
    const subTotal=Number(rate?.gross_expenses||0),totalDeductions=Number(rate?.total_deductions||0),totalManDays=Number(rate?.total_man_days||0);
    return {billing:{...period,byStudent:new Map(),totalManDays,totalBaseDays:0,totalReductionDays:0,operationalDays:0},
      legacyFinalized:true,expenses:[{name:'Recorded finalized expenses (legacy)',amount:subTotal}],subTotal,totalDeductions,
      deductions:{cashToken:{amount:0},creditToken:{amount:0},specialOrders:{amount:0},guestIncome:{amount:0},legacyUnclassified:{amount:totalDeductions}},
      totalExpenses:subTotal-totalDeductions,foodExpenses:subTotal-totalDeductions,totalManDays,dailyRate:Number(rate?.daily_rate||0),waterTotal:0,waterRate:0,
      totalBaseDays:0,totalReductionDays:0,studentManDaysMap:{}};
  }
  const billing = await getBillingDays(hostelId, month, year, transaction);
  const range = { [Op.between]: [billing.start, billing.end] };
  const [consumption, expenseRows, incomeRows, specialOrders] = await Promise.all([
    DailyConsumption.sum('total_cost', { where: { hostel_id: hostelId, consumption_date: range }, transaction }),
    MessDailyExpense.findAll({ where: { hostel_id: hostelId, expense_date: range }, include: [{ model: ExpenseType, as: 'ExpenseType' }], transaction }),
    AdditionalIncome.findAll({ where: { hostel_id: hostelId, received_date: range }, include: [{ model: IncomeType, as: 'IncomeType' }], transaction }),
    FoodOrder.sum('total_amount', { where: { hostel_id: hostelId, status: { [Op.ne]: 'cancelled' }, payment_status: 'pending', requested_time: { [Op.between]: [new Date(`${billing.start}T00:00:00+05:30`), new Date(`${billing.end}T23:59:59.999+05:30`)] } }, transaction })
  ]);
  const grouped = new Map();
  for (const row of expenseRows) {
    const name = row.ExpenseType?.name || 'Other expenses';
    grouped.set(name, (grouped.get(name) || 0) + Number(row.amount));
  }
  const expenses = [{ name: 'Rice & Grocery', amount: Number(consumption || 0) }, ...[...grouped].map(([name, amount]) => ({ name, amount }))];
  const waterTotal = [...grouped].filter(([name]) => /water/i.test(name)).reduce((sum, [, value]) => sum + value, 0);
  const income = name => incomeRows.filter(row => row.IncomeType?.name === name).reduce((sum, row) => sum + Number(row.amount), 0);
  const deductions = {
    cashToken: { amount: income('Cash Token') },
    creditToken: { amount: income('Sister Concern Bill'), description: incomeRows.filter(r => r.IncomeType?.name === 'Sister Concern Bill').map(r => r.description).filter(Boolean).join(', ') },
    specialOrders: { amount: Number(specialOrders || 0) }, guestIncome: { amount: income('Student Guest Income') }
  };
  const subTotal = expenses.reduce((sum, row) => sum + row.amount, 0);
  const totalDeductions = Object.values(deductions).reduce((sum, row) => sum + row.amount, 0);
  const totalExpenses = Math.max(0, subTotal - totalDeductions);
  const foodExpenses = Math.max(0, totalExpenses - waterTotal);
  const dailyRate = billing.totalManDays > 0 ? foodExpenses / billing.totalManDays : 0;
  return { billing, expenses, subTotal, deductions, totalDeductions, totalExpenses, foodExpenses,
    totalManDays: billing.totalManDays, dailyRate, waterTotal, waterRate: billing.totalBaseDays > 0 ? waterTotal / billing.totalBaseDays : 0,
    totalBaseDays: billing.totalBaseDays, totalReductionDays: billing.totalReductionDays,
    studentManDaysMap: Object.fromEntries([...billing.byStudent].map(([id, row]) => [id, row.billableDays])) };
}

export async function getMessCalculation(hostelId, month, year, transaction) {
  const policy = await hostelPolicy(hostelId, billingMonth(month, year).start, transaction);
  const historical = await sharedHistoricalCalculation(policy, hostelId, month, year, transaction);
  if (historical) return historical;
  const own = await getHostelCalculation(hostelId, month, year, transaction);
  if (own.finalized || own.legacyFinalized) return own;
  if (policy.mode !== 'shared') return { ...own, billingMode: 'hostel' };
  const members = await Promise.all(policy.hostel_ids.map(id => id === Number(hostelId) ? own : getHostelCalculation(id, month, year, transaction)));
  if (members.some(member => member.legacyFinalized || member.finalized)) throw Object.assign(new Error('This shared period has inconsistent finalized records. Preserve the existing bills and review the group.'), { status: 409 });
  const studentDays = new Set();
  for (const member of members) for (const [student, days] of member.billing.byStudent) for (const date of days.billableDates || []) {
    const key = `${student}:${date}`;
    if (studentDays.has(key)) throw Object.assign(new Error('A student has overlapping billable days in multiple linked hostels. Resolve the active enrollments before calculating a shared rate.'), { status: 409 });
    studentDays.add(key);
  }
  const range = { [Op.between]: [own.billing.start, own.billing.end] };
  const [poolCost, poolExpenses] = await Promise.all([
    DailyConsumption.sum('total_cost', { where: { inventory_id: policy.inventory_id, hostel_id: null, consumption_date: range }, transaction }),
    MessDailyExpense.findAll({ where: { inventory_id: policy.inventory_id, hostel_id: null, expense_date: range }, include: [{ model: ExpenseType, as: 'ExpenseType' }], transaction }),
  ]);
  const grouped = new Map();
  for (const member of members) for (const expense of member.expenses) grouped.set(expense.name, (grouped.get(expense.name) || 0) + expense.amount);
  grouped.set('Rice & Grocery', (grouped.get('Rice & Grocery') || 0) + Number(poolCost || 0));
  for (const row of poolExpenses) grouped.set(row.ExpenseType?.name || 'Other expenses', (grouped.get(row.ExpenseType?.name || 'Other expenses') || 0) + Number(row.amount));
  const expenses = [...grouped].map(([name, amount]) => ({ name, amount }));
  const waterTotal = expenses.filter(row => /water/i.test(row.name)).reduce((sum, row) => sum + row.amount, 0);
  const poolWater = poolExpenses.filter(row => /water/i.test(row.ExpenseType?.name || '')).reduce((sum, row) => sum + Number(row.amount), 0);
  const totalManDays = members.reduce((sum, member) => sum + member.billing.totalManDays, 0);
  const totalBaseDays = members.reduce((sum, member) => sum + member.billing.totalBaseDays, 0);
  const deductions = Object.fromEntries(Object.keys(own.deductions).map(key => [key, { amount: members.reduce((sum, member) => sum + Number(member.deductions[key]?.amount || 0), 0) }]));
  const totalDeductions = Object.values(deductions).reduce((sum, row) => sum + row.amount, 0);
  const subTotal = expenses.reduce((sum, row) => sum + row.amount, 0);
  const totalExpenses = Math.max(0, subTotal - totalDeductions);
  const foodExpenses = Math.max(0, totalExpenses - waterTotal);
  return { ...own, expenses, deductions, subTotal, totalDeductions, totalExpenses, foodExpenses, totalManDays,
    dailyRate: totalManDays > 0 ? foodExpenses / totalManDays : 0, billingMode: 'shared', inventoryId: policy.inventory_id,
    // Hostel-specific water fees remain separate; only common water is spread over the group.
    waterRate: own.waterRate + (totalBaseDays ? poolWater / totalBaseDays : 0),
    sharedSummary: { inventoryId: policy.inventory_id, hostelIds: policy.hostel_ids, totalManDays, totalBaseDays, grossExpenses: subTotal, deductions: totalDeductions,
      foodExpenses, waterTotal, dailyRate: totalManDays > 0 ? foodExpenses / totalManDays : 0 } };
}

export function studentWaterCharge(calculation, days, fees = []) {
  const explicit = fees.filter(fee => fee.fee_type === 'water_bill');
  return explicit.length ? explicit.reduce((sum, fee) => sum + Number(fee.amount), 0) : (days?.baseDays || 0) * calculation.waterRate;
}
