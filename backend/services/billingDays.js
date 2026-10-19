import { Op } from 'sequelize';
import { Enrollment, Session, Holiday, ReductionDay, DayReductionRequest } from '../models/index.js';
import { calculateBillableDays, dateOnly, errorWithStatus } from '../utils/reductionRules.js';

export function billingMonth(month, year) {
  const m = Number(month), y = Number(year);
  if (!Number.isInteger(m) || m < 1 || m > 12 || !Number.isInteger(y) || y < 2000 || y > 2100) throw errorWithStatus('Select a valid month and year.');
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dates = Array.from({ length: last }, (_, i) => `${y}-${String(m).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
  return { start: dates[0], end: dates.at(-1), dates, month: m, year: y };
}

export async function getBillingDays(hostelId, month, year, transaction) {
  if (!Number(hostelId)) throw errorWithStatus('Select a hostel for billing.');
  const period = billingMonth(month, year);
  const [enrollments, holidays, reductions] = await Promise.all([
    Enrollment.findAll({ where: { hostel_id: hostelId, status: 'active' }, include: [{ model: Session, required: false }], transaction }),
    Holiday.findAll({ where: { hostel_id: hostelId, date: { [Op.between]: [period.start, period.end] } }, raw: true, transaction }),
    ReductionDay.findAll({ where: { hostel_id: hostelId, active: true, date: { [Op.between]: [period.start, period.end] } },
      include: [{ model: DayReductionRequest, as: 'Request', required: true, where: { workflow_version: 2, status: { [Op.in]: ['approved_by_admin', 'approved_by_warden'] } } }], transaction })
  ]);
  const byStudent = new Map();
  for (const entry of enrollments) {
    const row = entry.get({ plain: true }), id = String(row.student_id);
    // Session dates are explicit eligibility bounds. Import timestamps are not proof of admission.
    const schoolDate = value => dateOnly(new Date(value).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
    const eligibleFrom = row.Session?.start_date ? schoolDate(row.Session.start_date) : null;
    const eligibleTo = row.Session?.end_date ? schoolDate(row.Session.end_date) : null;
    const result = calculateBillableDays({ dates: period.dates, holidays: holidays.map(h => h.date),
      approvedDates: reductions.filter(r => String(r.student_id) === id).map(r => r.date), eligibleFrom, eligibleTo });
    const previous = byStudent.get(id);
    if (previous) {
      byStudent.set(id, calculateBillableDays({ dates: [...previous.baseDates, ...result.baseDates],
        approvedDates: [...previous.reductionDates, ...result.reductionDates] }));
    } else byStudent.set(id, result);
  }
  return { ...period, byStudent, totalManDays: [...byStudent.values()].reduce((sum, row) => sum + row.billableDays, 0),
    totalBaseDays: [...byStudent.values()].reduce((sum, row) => sum + row.baseDays, 0),
    totalReductionDays: [...byStudent.values()].reduce((sum, row) => sum + row.approvedReductionDays, 0),
    operationalDays: period.dates.filter(d => !holidays.some(h => h.date === d)).length };
}
