import crypto from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Hostel, User, Role, Attendance, GPSAttendance, MessBill, MonthlyAttendanceImport } from '../models/index.js';
import { getHistoricalBilling } from '../utils/historicalBilling.js';
import { attendancePeriod, validateMonthlyRows, MONTHLY_ATTENDANCE_HEADERS } from '../utils/monthlyAttendanceValidation.js';

async function roster(hostelId, transaction) {
  const roles = await Role.findAll({ where: { roleName: { [Op.in]: ['Student', 'student', 'LAPC', 'lapc'] } }, transaction });
  return User.findAll({ where: { hostel_id: hostelId, roleId: { [Op.in]: roles.map(r => r.roleId) }, status: true },
    attributes: ['userId', 'userName', 'roll_number'], order: [['userName', 'ASC']], transaction });
}

async function inspectImport(body, transaction) {
  const hostelId = Number(body.hostel_id);
  if (!Number.isInteger(hostelId) || hostelId <= 0) throw new Error('Select a hostel.');
  const period = attendancePeriod(body.month, body.year);
  const hostel = await Hostel.findByPk(hostelId, { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
  if (!hostel?.is_active) throw new Error('Selected hostel is missing or inactive.');
  const rows = validateMonthlyRows(body.rows, await roster(hostelId, transaction), period.days);
  const blockers = [];
  if (await getHistoricalBilling(hostelId, period.month, period.year)) blockers.push('This month has a protected historical billing statement. Its attendance cannot be changed by import.');
  if (await MessBill.count({ where: { hostel_id: hostelId, month: period.month, year: period.year }, transaction })) {
    blockers.push('Bills already exist for this hostel and month. Attendance import is blocked to keep those bills consistent.');
  }
  const ids = rows.map(r => r.student_id).filter(Boolean);
  if (ids.length) {
    const existing = await Attendance.findAll({ where: { hostel_id: hostelId, student_id: { [Op.in]: ids },
      date: { [Op.between]: [period.start, period.end] } }, transaction });
    const gps = await GPSAttendance.findAll({ where: { hostel_id: hostelId, user_id: { [Op.in]: ids },
      attendance_date: { [Op.between]: [period.start, period.end] } }, attributes: ['user_id'], transaction });
    const occupied = new Set([...existing.map(r => r.student_id), ...gps.map(r => r.user_id)]);
    for (const row of rows) if (occupied.has(row.student_id)) row.errors.push('Attendance already exists for this student in this month. Existing records will not be overwritten.');
  }
  const invalidRows = rows.filter(r => r.errors.length).length;
  return { hostelId, period, rows, blockers, valid: !invalidRows && !blockers.length,
    summary: { totalRows: rows.length, validRows: rows.length - invalidRows, invalidRows,
      totalManDays: rows.filter(r => !r.errors.length).reduce((sum, r) => sum + r.mess_days, 0) } };
}

export async function getMonthlyAttendanceRoster(req, res) {
  try {
    const hostelId = Number(req.query.hostel_id);
    if (!Number.isInteger(hostelId) || hostelId <= 0) return res.status(400).json({ message: 'Select a hostel.' });
    const students = await roster(hostelId);
    res.json({ success: true, headers: MONTHLY_ATTENDANCE_HEADERS, data: students });
  } catch (error) { res.status(500).json({ message: 'Unable to load the student roster.' }); }
}

export async function previewMonthlyAttendance(req, res) {
  try { res.json({ success: true, data: await inspectImport(req.body) }); }
  catch (error) { res.status(400).json({ success: false, message: error.message }); }
}

export async function importMonthlyAttendance(req, res) {
  try {
    const result = await sequelize.transaction(async transaction => {
      // Repeat validation under a hostel lock; never trust the earlier browser preview.
      const inspection = await inspectImport(req.body, transaction);
      if (!inspection.valid) {
        const error = new Error('Import blocked. Review the current validation results.');
        error.inspection = inspection;
        throw error;
      }
      const { hostelId, period, rows } = inspection;
      const fileName = String(req.body.file_name || 'monthly-attendance.xlsx').split(/[\\/]/).pop().slice(0, 255);
      const sourceHash = crypto.createHash('sha256').update(JSON.stringify({ hostelId, period, rows })).digest('hex');
      const records = await Attendance.bulkCreate(rows.map(r => ({ student_id: r.student_id, hostel_id: hostelId,
        date: period.start, status: r.mess_days > 0 ? 'P' : 'A', is_monthly: true, totalManDays: r.mess_days,
        marked_by: req.user.userId, remarks: `Admin monthly Excel import: ${fileName}, row ${r.row}. Monthly total only; individual dates unavailable.`
      })), { transaction });
      const audit = await MonthlyAttendanceImport.create({ hostel_id: hostelId, month: period.month, year: period.year,
        imported_by: req.user.userId, file_name: fileName, source_hash: sourceHash, row_count: rows.length,
        total_man_days: inspection.summary.totalManDays,
        records: rows.map((r, i) => ({ ...r, attendance_id: records[i].id })) }, { transaction });
      return { importId: audit.id, ...inspection.summary, month: period.month, year: period.year };
    });
    res.status(201).json({ success: true, data: result, message: 'Monthly attendance imported successfully. No bills or emails were generated.' });
  } catch (error) {
    res.status(error.inspection ? 409 : 400).json({ success: false, message: error.message, data: error.inspection });
  }
}

export async function getMonthlyAttendanceImports(req, res) {
  try {
    const hostelId = Number(req.query.hostel_id);
    if (!Number.isInteger(hostelId) || hostelId <= 0) return res.status(400).json({ message: 'Select a hostel.' });
    const data = await MonthlyAttendanceImport.findAll({ where: { hostel_id: hostelId },
      attributes: { exclude: ['records'] }, order: [['createdAt', 'DESC']], limit: 30 });
    res.json({ success: true, data });
  } catch (error) { res.status(500).json({ message: 'Unable to load import history.' }); }
}
