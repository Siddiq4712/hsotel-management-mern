import { Op } from 'sequelize';
import { Attendance, GPSAttendance, StudentFee, MessBill } from '../models/index.js';
import { getMessCalculation } from './messCalculation.js';
import { getHistoricalBilling } from '../utils/historicalBilling.js';

export async function studentMessCharges(user, month, year) {
  const historical = await getHistoricalBilling(user.hostel_id, month, year);
  if (historical) {
    const row = historical.rows.find(r => String(r.studentId) === String(user.userId) || String(r.regNo) === String(user.roll_number));
    return { historical: true, dailyCharges: [], monthlySummary: {
      monthlyCalculatedDailyRate: historical.daily.dailyRate, studentTotalManDaysForMonth: row?.messDays || 0,
      baseDays: null, approvedReductionDays: null, historicalMessAmount: row?.messAmount || 0,
      historicalFinalAmount: row?.finalAmount || 0, flatFees: [], message: 'Historical monthly statement; daily attendance is not available.' } };
  }
  const bill = await MessBill.findOne({ where: { student_id: user.userId, hostel_id: user.hostel_id, month, year } });
  if (bill && !bill.billing_breakdown) return { legacyFinalized:true, dailyCharges:[], monthlySummary:{
    monthlyCalculatedDailyRate:0,studentTotalManDaysForMonth:0,baseDays:null,approvedReductionDays:null,
    historicalFinalAmount:Number(bill.amount),flatFees:[],message:'Existing finalized bill preserved; daily breakdown is not reconstructed.' } };
  const calculation = await getMessCalculation(user.hostel_id, month, year);
  const { billing } = calculation;
  const [attendance, gps, fees] = await Promise.all([
    Attendance.findAll({ where: { student_id: user.userId, hostel_id: user.hostel_id, is_monthly: false, date: { [Op.between]: [billing.start, billing.end] } }, raw: true }),
    GPSAttendance.findAll({ where: { user_id: user.userId, hostel_id: user.hostel_id, attendance_date: { [Op.between]: [billing.start, billing.end] } }, raw: true }),
    StudentFee.findAll({ where: { student_id: user.userId, hostel_id: user.hostel_id, month, year }, raw: true })
  ]);
  const frozen = bill?.billing_breakdown || (calculation.frozenRows?.find(row=>String(row.studentId)===String(user.userId)) ? {
    ...calculation.frozenRows.find(row=>String(row.studentId)===String(user.userId)),workflow_version:2
  } : null);
  const days = frozen?.workflow_version === 2 ? { baseDays: frozen.baseDays, approvedReductionDays: frozen.approvedReductionDays,
    billableDays: frozen.messDays, billableDates: frozen.billableDates, reductionDates: frozen.reductionDates } : billing.byStudent.get(String(user.userId));
  const rate = frozen?.workflow_version === 2 ? frozen.dailyRate : calculation.dailyRate;
  const dailyCharges = billing.dates.map(date => {
    const att = attendance.find(a => a.date === date);
    const status = att?.status || gps.find(a => a.attendance_date === date)?.status || null;
    const approvedReduction = days?.reductionDates?.includes(date) || false;
    const charged = days?.billableDates?.includes(date) || false;
    return { id: date, date, attendance_status: status, reduction_request_id: att?.reduction_request_id,
      approvedReduction, billing_reason: approvedReduction ? 'Approved reduction' : charged ? 'Billable operational day' : 'Outside billable calendar',
      baseMessCharge: charged ? rate : 0, specialFoodCost: 0, dailyTotalCharge: charged ? rate : 0 };
  });
  const special = fees.filter(f => f.fee_type === 'special_food_charge').reduce((sum, f) => sum + Number(f.amount), 0);
  const flatFees = fees.filter(f => f.fee_type !== 'special_food_charge');
  if (!flatFees.some(f => f.fee_type === 'water_bill') && calculation.waterRate > 0) flatFees.push({ fee_type: 'water_bill', description: 'Water (base operational days; no reduction)', amount: (days?.baseDays || 0) * calculation.waterRate });
  return { dailyCharges, finalized: Boolean(bill), monthlySummary: {
    monthlyCalculatedDailyRate: rate, studentTotalManDaysForMonth: days?.billableDays || 0,
    baseDays: days?.baseDays || 0, approvedReductionDays: days?.approvedReductionDays || 0,
    totalMonthlySpecialFoodCost: frozen?.workflow_version === 2 ? frozen.specialFoodAmount : special,
    flatFees: frozen?.workflow_version === 2 ? [{ fee_type: 'other', amount: frozen.additionalAmount - frozen.specialFoodAmount + frozen.bedCharges + frozen.hinduIndianExpress }] : flatFees,
    message: 'Food billing uses approved reduction dates. Attendance does not grant reduction.' } };
}
