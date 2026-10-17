import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import multer from 'multer';
import { Op } from 'sequelize';
import { sequelize, User, Hostel, Attendance, DayReductionRequest, ReductionDay, ReductionDecision, MessBill, DailyRateLog, Enrollment } from '../models/index.js';
import { REDUCTION_CATEGORIES, APPROVED_REDUCTION_STATUSES, canReviewReduction, dateOnly, errorWithStatus, reductionDates, validateReduction } from '../utils/reductionRules.js';
import { getHistoricalBilling } from '../utils/historicalBilling.js';

const documentRoot = fileURLToPath(new URL('../private/reductions/', import.meta.url));
const uploader = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 8 } }).single('document');
export function uploadReductionDocument(req, res, next) {
  uploader(req, res, error => error ? res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ message: 'Upload one PDF, PNG, or JPEG document, at most 5 MB.' }) : next());
}

async function storeDocument(file) {
  if (!file) throw errorWithStatus('Upload the required supporting document.');
  const bytes = file.buffer;
  const kind = bytes.subarray(0, 5).toString() === '%PDF-' ? ['pdf', 'application/pdf']
    : bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ? ['png', 'image/png']
    : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 ? ['jpg', 'image/jpeg'] : null;
  if (!kind || bytes.length > 5 * 1024 * 1024) throw errorWithStatus('The supporting document must be a PDF, PNG, or JPEG file up to 5 MB.');
  await fs.mkdir(documentRoot, { recursive: true });
  const key = crypto.randomUUID() + '.' + kind[0];
  await fs.writeFile(path.join(documentRoot, key), bytes, { flag: 'wx' });
  return { key, name: path.basename(file.originalname).replace(/[\r\n]/g, '').slice(0, 180), mime: kind[1], size: bytes.length };
}

function readAllowed(user, request) {
  return canReviewReduction(user, request) || (['student', 'lapc'].includes(user.role) && Number(user.userId) === Number(request.student_id));
}
function publicRequest(record) {
  const row = JSON.parse(JSON.stringify(record.get ? record.get({ plain: true }) : record));
  row.document = row.document ? { name: row.document.name, mime: row.document.mime, size: row.document.size } : null;
  row.legacy = row.workflow_version !== 2;
  row.attendance_status = REDUCTION_CATEGORIES[row.category]?.attendance || null;
  row.requested_days = Math.round((Date.parse(row.to_date) - Date.parse(row.from_date)) / 86400000) + 1;
  if (row.Decisions) row.Decisions = row.Decisions.map(({ previous_values, ...decision }) => decision);
  return row;
}
async function studentLock(studentId, transaction) {
  const student = await User.findByPk(studentId, { transaction, lock: transaction.LOCK.UPDATE });
  if (!student) throw errorWithStatus('Student not found.', 404);
  return student;
}

async function openPeriods(request, transaction) {
  const periods = new Set(reductionDates(request.from_date, request.to_date).map(d => d.slice(0, 7)));
  // Match billing's hostel lock so approval cannot race with bill generation.
  await Hostel.findByPk(request.hostel_id, { transaction, lock: transaction.LOCK.UPDATE });
  for (const period of periods) {
    const [year, month] = period.split('-').map(Number);
    if (await getHistoricalBilling(request.hostel_id, month, year) || await MessBill.count({ where: { hostel_id: request.hostel_id, month, year }, transaction })) {
      throw errorWithStatus(`Billing is already recorded for ${period}. Use a financial adjustment; this request cannot change that period.`, 409);
    }
  }
  return periods;
}
async function noOverlap(request, transaction, pending = false) {
  const statuses = [...APPROVED_REDUCTION_STATUSES, ...(pending ? ['pending_admin'] : [])];
  const existing = await DayReductionRequest.findOne({ where: {
    student_id: request.student_id, hostel_id: request.hostel_id, workflow_version: 2,
    ...(request.id ? { id: { [Op.ne]: request.id } } : {}),
    status: { [Op.in]: statuses }, from_date: { [Op.lte]: request.to_date }, to_date: { [Op.gte]: request.from_date }
  }, transaction });
  if (existing) throw errorWithStatus(`The dates overlap request #${existing.id}. Each date can receive reduction only once.`, 409);
}
async function decisionLog(request, user, action, remarks, transaction, previous = null) {
  await ReductionDecision.create({ request_id: request.id, actor_id: user.userId, actor_role: user.role,
    action, remarks: remarks || null, previous_values: previous }, { transaction });
}

export async function submitReduction(req, res) {
  let document;
  try {
    const values = validateReduction(req.body);
    document = await storeDocument(req.file);
    const record = await sequelize.transaction(async transaction => {
      const student = await studentLock(req.user.userId, transaction);
      if (!student.hostel_id) throw errorWithStatus('No hostel assigned.');
      const request = { ...values, student_id: student.userId, hostel_id: student.hostel_id };
      await noOverlap(request, transaction, true);
      const result = await DayReductionRequest.create({ ...request, document, workflow_version: 2, status: 'pending_admin' }, { transaction });
      await decisionLog(result, req.user, 'submitted', null, transaction);
      return result;
    });
    res.status(201).json({ success: true, data: publicRequest(record), message: 'Submitted for warden or admin approval.' });
  } catch (error) {
    if (document) await fs.unlink(path.join(documentRoot, document.key)).catch(() => {});
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
}

export async function listReductions(req, res) {
  try {
    const where = {};
    if (['student', 'lapc'].includes(req.user.role)) where.student_id = req.user.userId;
    else if (req.user.role === 'warden') {
      if (!req.user.hostel_id) throw errorWithStatus('No hostel assigned.', 403);
      where.hostel_id = req.user.hostel_id;
    } else if (req.user.role === 'admin') {
      if (req.query.hostel_id && req.query.hostel_id !== 'all') where.hostel_id = Number(req.query.hostel_id);
    } else throw errorWithStatus('Access denied.', 403);
    if (req.query.status && req.query.status !== 'all') {
      where.status = req.query.status === 'approved' ? { [Op.in]: APPROVED_REDUCTION_STATUSES }
        : req.query.status === 'rejected' ? { [Op.in]: ['rejected_by_admin', 'rejected_by_warden'] } : req.query.status;
    }
    if (req.query.category && req.query.category !== 'all') where.category = req.query.category;
    if (req.query.from_date && req.query.to_date) {
      where.from_date = { [Op.lte]: dateOnly(req.query.to_date) }; where.to_date = { [Op.gte]: dateOnly(req.query.from_date) };
    }
    const requests = await DayReductionRequest.findAll({ where, include: [
      { model: User, as: 'Student', attributes: ['userId', 'userName', 'roll_number'] },
      { model: Hostel, as: 'Hostel', attributes: ['id', 'name'] },
      { model: User, as: 'AdminProcessor', attributes: ['userId', 'userName'] },
      { model: User, as: 'WardenProcessor', attributes: ['userId', 'userName'] },
      { model: ReductionDecision, as: 'Decisions', attributes: { exclude: ['previous_values'] }, include: [{ model: User, as: 'Actor', attributes: ['userName'] }] }
    ], order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: requests.map(publicRequest) });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}

export async function reductionDocument(req, res) {
  try {
    const request = await DayReductionRequest.findByPk(req.params.id);
    if (!request || !readAllowed(req.user, request)) throw errorWithStatus('Document not found.', 404);
    if (!request.document?.key) throw errorWithStatus('This legacy request has no supporting document.', 404);
    const key = request.document.key;
    if (path.basename(key) !== key) throw errorWithStatus('Invalid document.', 400);
    res.setHeader('Content-Type', request.document.mime);
    res.setHeader('Content-Disposition', `inline; filename="reduction-${request.id}${path.extname(key)}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.send(await fs.readFile(path.join(documentRoot, key)));
  } catch (error) { res.status(error.status || (error.code === 'ENOENT' ? 404 : 500)).json({ message: error.message }); }
}

export async function reviseReduction(req, res) {
  let document;
  try {
    const values = validateReduction(req.body);
    if (req.file) document = await storeDocument(req.file);
    const result = await sequelize.transaction(async transaction => {
      await studentLock(req.user.userId, transaction);
      const request = await DayReductionRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!request || Number(request.student_id) !== Number(req.user.userId)) throw errorWithStatus('Request not found.', 404);
      if (!['pending_admin', 'needs_correction', 'rejected_by_admin', 'rejected_by_warden'].includes(request.status)) throw errorWithStatus('Only pending, returned, or rejected requests can be resubmitted.', 409);
      if (!document && !request.document) throw errorWithStatus('Upload the required supporting document.');
      const previous = JSON.parse(JSON.stringify(request.get({ plain: true })));
      await noOverlap({ ...previous, ...values }, transaction, true);
      await request.update({ ...values, document: document || request.document, workflow_version: 2, status: 'pending_admin',
        admin_id: null, warden_id: null, admin_remarks: null, warden_remarks: null, decided_at: null }, { transaction });
      await decisionLog(request, req.user, 'resubmitted', null, transaction, previous);
      return request;
    });
    res.json({ success: true, data: publicRequest(result), message: 'Resubmitted for review.' });
  } catch (error) {
    if (document) await fs.unlink(path.join(documentRoot, document.key)).catch(() => {});
    res.status(error.status || 500).json({ message: error.message });
  }
}

export async function decideReduction(req, res) {
  try {
    const action = req.body.action || (req.body.status === 'approved' ? 'approve' : req.body.status === 'rejected' ? 'reject' : null);
    if (!['approve', 'reject', 'return', 'cancel'].includes(action)) throw errorWithStatus('Choose approve, reject, return, or cancel.');
    const remarks = String(req.body.remarks || req.body.admin_remarks || req.body.warden_remarks || '').trim();
    if (action !== 'approve' && (remarks.length < 5 || remarks.length > 2000)) throw errorWithStatus('Enter a reason between 5 and 2000 characters.');
    const result = await sequelize.transaction(async transaction => {
      let request = await DayReductionRequest.findByPk(req.params.id, { transaction });
      if (!request) throw errorWithStatus('Request not found.', 404);
      const reviewer = canReviewReduction(req.user, request);
      const owner = ['student', 'lapc'].includes(req.user.role) && Number(req.user.userId) === Number(request.student_id);
      if (!reviewer && !(owner && action === 'cancel' && ['pending_admin', 'needs_correction'].includes(request.status))) throw errorWithStatus('You cannot process this request.', 403);
      await studentLock(request.student_id, transaction);
      request = await DayReductionRequest.findByPk(req.params.id, { transaction, lock: transaction.LOCK.UPDATE });
      const before = JSON.parse(JSON.stringify(request.get({ plain: true })));
      const approved = APPROVED_REDUCTION_STATUSES.includes(request.status);
      if (approved && action !== 'cancel') throw errorWithStatus('Already approved. Cancel with a reason before submitting a replacement.', 409);
      if (!approved && !['pending_admin', 'needs_correction'].includes(request.status)) throw errorWithStatus('This request has already been decided.', 409);
      let periods;
      if (action === 'approve' || approved) periods = await openPeriods(request, transaction);
      if (action === 'approve') {
        if (request.workflow_version !== 2 || !request.document?.key) throw errorWithStatus('Legacy requests need category and document resubmission before approval.', 409);
        validateReduction(before);
        await fs.access(path.join(documentRoot, path.basename(request.document.key)));
        if (!await Enrollment.count({ where: { student_id: request.student_id, hostel_id: request.hostel_id, status: 'active' }, transaction })) throw errorWithStatus('Student has no active enrollment in this hostel.', 409);
        await noOverlap(request, transaction);
        const status = REDUCTION_CATEGORIES[request.category].attendance;
        for (const date of reductionDates(request.from_date, request.to_date)) {
          const attendance = await Attendance.findAll({ where: { student_id: request.student_id, hostel_id: request.hostel_id, date,
            [Op.or]: [{ is_monthly: false }, { is_monthly: null }] }, transaction, lock: transaction.LOCK.UPDATE });
          const snapshots = attendance.map(row => JSON.parse(JSON.stringify(row.get({ plain: true }))));
          const values = { student_id: request.student_id, hostel_id: request.hostel_id, date, status, is_monthly: false,
            from_date: request.from_date, to_date: request.to_date, reason: request.category === 'internship' ? 'Internship' : 'Other',
            remarks: `${REDUCTION_CATEGORIES[request.category].label}: reduction #${request.id} approved by ${req.user.role}`,
            marked_by: req.user.userId, totalManDays: status === 'A' ? 0 : 1, reduction_request_id: request.id };
          let createdId = null;
          if (attendance.length) for (const row of attendance) await row.update(values, { transaction });
          else createdId = (await Attendance.create(values, { transaction })).id;
          await ReductionDay.create({ request_id: request.id, student_id: request.student_id, hostel_id: request.hostel_id,
            date, attendance_status: status, before_attendance: snapshots, created_attendance_id: createdId, active: true }, { transaction });
        }
      } else if (action === 'cancel' && approved) {
        if (request.workflow_version !== 2) throw errorWithStatus('Legacy approvals require a separate historical correction.', 409);
        const days = await ReductionDay.findAll({ where: { request_id: request.id, active: true }, transaction });
        for (const day of days) {
          const current = await Attendance.findAll({ where: { student_id: day.student_id, hostel_id: day.hostel_id, date: day.date, reduction_request_id: request.id }, transaction });
          for (const row of current) {
            const previous = day.before_attendance.find(a => Number(a.id) === Number(row.id));
            if (previous) { const { id, createdAt, updatedAt, ...values } = previous; await row.update(values, { transaction }); }
            else await row.destroy({ transaction });
          }
          await day.update({ active: false }, { transaction });
        }
      }
      const status = action === 'approve' ? `approved_by_${req.user.role}` : action === 'reject' ? `rejected_by_${req.user.role}` : action === 'return' ? 'needs_correction' : 'cancelled';
      await request.update({ status, decided_at: new Date(), ...(reviewer ? { [req.user.role === 'admin' ? 'admin_id' : 'warden_id']: req.user.userId,
        [req.user.role === 'admin' ? 'admin_remarks' : 'warden_remarks']: remarks } : {}) }, { transaction });
      await decisionLog(request, req.user, action, remarks, transaction, before);
      if (periods) for (const period of periods) {
        const [year, month] = period.split('-').map(Number);
        await DailyRateLog.destroy({ where: { hostel_id: request.hostel_id, month, year }, transaction });
      }
      return request;
    });
    res.json({ success: true, data: publicRequest(result), message: `Reduction ${action === 'approve' ? 'approved and attendance updated' : action === 'return' ? 'returned for correction' : action === 'cancel' ? 'cancelled; any approval-generated attendance restored' : 'rejected'}.` });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}
