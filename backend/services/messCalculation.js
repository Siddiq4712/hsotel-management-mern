import { Op } from 'sequelize';
import { DailyConsumption, MessDailyExpense, ExpenseType, AdditionalIncome, IncomeType, FoodOrder, MessBillingSnapshot, MessBill, DailyRateLog } from '../models/index.js';
import { getBillingDays, billingMonth } from './billingDays.js';

// Every open-month report, rate, and bill uses these exact costs and approval-backed days.
export async function getMessCalculation(hostelId, month, year, transaction) {
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
    FoodOrder.sum('total_amount', { where: { hostel_id: hostelId, status: { [Op.in]: ['confirmed', 'delivered'] }, payment_status: 'pending', order_date: range }, transaction })
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

export function studentWaterCharge(calculation, days, fees = []) {
  const explicit = fees.filter(fee => fee.fee_type === 'water_bill');
  return explicit.length ? explicit.reduce((sum, fee) => sum + Number(fee.amount), 0) : (days?.baseDays || 0) * calculation.waterRate;
}
