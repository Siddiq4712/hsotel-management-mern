import { Op } from 'sequelize';
import { Enrollment, User, StudentFee, MessBill } from '../models/index.js';
import { getMessCalculation, studentWaterCharge } from './messCalculation.js';

export function roundBill(amount) {
  const floor = Math.floor(amount);
  return amount - floor <= 0.20 + 1e-7 ? floor : Math.ceil(amount);
}

export async function buildMonthlyMessReport(hostelId, month, year, college, transaction) {
  const calculation = await getMessCalculation(hostelId, month, year, transaction);
  const { billing } = calculation;
  if (calculation.frozenRows) return summarize(calculation.frozenRows.filter(row=>!college||college==='all'||row.college===college),calculation);
  const enrollments = await Enrollment.findAll({ where: { hostel_id: hostelId, status: 'active',
    ...(college && college !== 'all' ? { college } : {}) },
    include: [{ model: User, as: 'Student', required: false }], transaction });
  const fees = await StudentFee.findAll({ where: { hostel_id: hostelId, month, year }, raw: true, transaction });
  if (calculation.legacyFinalized) {
    const bills = await MessBill.findAll({where:{hostel_id:hostelId,month,year},transaction});
    const data = bills.filter(bill=>!college||college==='all'||enrollments.some(e=>String(e.student_id)===String(bill.student_id))).map(bill=>{
      const enrollment=enrollments.find(e=>String(e.student_id)===String(bill.student_id));
      return bill.billing_breakdown || {studentId:String(bill.student_id),name:enrollment?.Student?.userName||`Student #${bill.student_id}`,regNo:enrollment?.Student?.roll_number||'',college:enrollment?.college,
        legacyFinalized:true,breakdownUnavailable:true,baseDays:null,approvedReductionDays:null,messDays:0,dailyRate:calculation.dailyRate,
        messAmount:0,waterCharges:0,specialFoodAmount:0,additionalAmount:0,bedCharges:0,hinduIndianExpress:0,total:Number(bill.amount),netAmount:Number(bill.amount),finalAmount:Number(bill.amount),roundingUp:0};
    });
    return {...summarize(data,calculation),legacyFinalized:true};
  }
  const unique = new Map();
  for (const entry of enrollments) if (!unique.has(String(entry.student_id))) unique.set(String(entry.student_id), entry);
  const data = [...unique].map(([studentId, entry]) => {
    const person = entry.Student;
    const days = billing.byStudent.get(studentId) || { baseDays: 0, approvedReductionDays: 0, billableDays: 0, billableDates: [], reductionDates: [] };
    const ownFees = fees.filter(f => String(f.student_id) === studentId);
    const sum = type => ownFees.filter(f => f.fee_type === type).reduce((total, row) => total + Number(row.amount), 0);
    const waterCharges = studentWaterCharge(calculation, days, ownFees);
    const additionalAmount = ownFees.filter(f => !['bed_charge', 'newspaper', 'water_bill'].includes(f.fee_type)).reduce((total, row) => total + Number(row.amount), 0) + waterCharges;
    const messAmount = days.billableDays * calculation.dailyRate;
    const total = messAmount + additionalAmount + sum('bed_charge') + sum('newspaper');
    const finalAmount = roundBill(total);
    return { studentId, name: person?.userName || `Student ${entry.roll_number || studentId}`, regNo: person?.roll_number || entry.roll_number || '',
      email: person?.userMail || '', college: entry.college, baseDays: days.baseDays, approvedReductionDays: days.approvedReductionDays,
      messDays: days.billableDays, billableDates: days.billableDates, reductionDates: days.reductionDates,
      dailyRate: calculation.dailyRate, messAmount, waterCharges, specialFoodAmount: sum('special_food_charge'),
      additionalAmount, bedCharges: sum('bed_charge'), hinduIndianExpress: sum('newspaper'),
      total, netAmount: total, finalAmount, roundingUp: finalAmount - total };
  });
  return summarize(data, calculation);
}

function summarize(data, calculation) {
  const {billing}=calculation;
  const summary = data.reduce((sum, row) => {
    sum.totalMessAmount += row.messAmount; sum.totalAdditionalAmount += row.additionalAmount;
    sum.totalBedCharges += row.bedCharges; sum.totalHinduIndianExpress += row.hinduIndianExpress;
    sum.totalWaterCharges += row.waterCharges; sum.grandTotal += row.finalAmount;
    return sum;
  }, { totalMessAmount: 0, totalAdditionalAmount: 0, totalBedCharges: 0, totalHinduIndianExpress: 0, totalWaterCharges: 0, grandTotal: 0 });
  return { success: true, data, summary: { ...summary, operationalDays: billing.operationalDays, daysInMonth: billing.dates.length,
    holidayCount: billing.operationalDays == null ? null : billing.dates.length - billing.operationalDays, dailyRate: calculation.dailyRate, messDays: billing.totalManDays,
    baseDays: billing.totalBaseDays, approvedReductionDays: billing.totalReductionDays,
    totalFoodIngredientCost: calculation.expenses[0].amount, foodExpenses: calculation.foodExpenses,
    billingBasis: calculation.historicalImport ? 'Approved historical import; original days, water treatment and rounding preserved' : calculation.legacyFinalized ? 'Recorded finalized legacy bill; detailed breakdown unavailable' : 'Operational days minus approved reductions; food only' }, calculation };
}
