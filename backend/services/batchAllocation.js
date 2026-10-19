import { createHash } from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Session, Hostel, Enrollment, User, Role, RoomAllotment, HostelRoom } from '../models/index.js';

export function normalizeBatchYear(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{4}$/.test(raw) || Number(raw) < 2000 || Number(raw) > 2100) throw new Error('A valid ERP batch admission year is required, for example 2024. Fetch it from ERP or enter it explicitly.');
  return Number(raw);
}

export function matchBatch(batchYear, batches) {
  const year = normalizeBatchYear(batchYear);
  const matches = batches.filter(batch => batch.is_active && Number(batch.erp_batch_year) === year);
  if (matches.length !== 1) throw new Error(matches.length ? `Ambiguous batch configuration for admission year ${year}` : `No batch configured for admission year ${year}. Configure it in Manage Batches.`);
  if (!matches[0].hostel_id) throw new Error(`Assign a hostel to batch ${matches[0].name} first.`);
  return matches[0];
}

export function validateBatch(input, batches, editingId = null) {
  const start = Number(input.start_year);
  const end = Number(input.end_year);
  const year = normalizeBatchYear(input.erp_batch_year ?? input.start_year);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 2000 || end > 2100 || end <= start) throw new Error('Enter valid start and end years. End year must be later than start year.');
  if (year !== start) throw new Error('ERP batch admission year must match the batch start year.');
  if (batches.some(batch => String(batch.id) !== String(editingId) && Number(batch.erp_batch_year) === year)) throw new Error('This admission year is already configured. Edit its existing batch.');
  if (batches.some(batch => String(batch.id) !== String(editingId) && batch.name === `${start}-${end}`)) throw new Error('This batch already exists. Edit its existing record.');
  return { name: `${start}-${end}`, start_date: `${start}-06-01`, end_date: `${end}-05-31`, erp_batch_year: year, hostel_id: Number(input.hostel_id), is_active: input.is_active !== false };
}

// Lock hostel rows in a consistent order to serialize configuration changes.
export async function lockBatchConfiguration(transaction) {
  return Hostel.findAll({ order: [['id', 'ASC']], transaction, lock: transaction.LOCK.UPDATE });
}

export async function listBatches(transaction) {
  const [batches, hostels, enrollments] = await Promise.all([
    Session.findAll({ order: [['start_date', 'DESC']], transaction }),
    Hostel.findAll({ attributes: ['id', 'name', 'is_active'], transaction }),
    Enrollment.findAll({ where: { status: 'active' }, attributes: ['student_id', 'session_id'], raw: true, transaction })
  ]);
  return batches.map(batch => ({ ...batch.toJSON(), hostel_name: hostels.find(hostel => hostel.id === batch.hostel_id)?.name || '',
    student_count: new Set(enrollments.filter(entry => entry.session_id === batch.id).map(entry => entry.student_id)).size }));
}

export async function resolveStudentBatch(batchYear, actor, transaction) {
  if (transaction) await lockBatchConfiguration(transaction);
  const batch = matchBatch(batchYear, await Session.findAll({ transaction, lock: transaction?.LOCK.SHARE }));
  const hostel = await Hostel.findByPk(batch.hostel_id, { transaction });
  if (!hostel?.is_active) throw new Error(`Hostel assigned to batch ${batch.name} is inactive.`);
  const actorHostel = actor.hostel_id || actor.hostelId;
  if (actor.role !== 'admin' && Number(actorHostel) !== batch.hostel_id) throw new Error(`Batch ${batch.name} belongs to ${hostel.name}. You can only enroll students in your assigned hostel.`);
  return batch;
}

export async function assertCanMove(studentId, hostelId, transaction) {
  const allotments = await RoomAllotment.findAll({ where: { student_id: studentId, is_active: true }, transaction });
  for (const allotment of allotments) {
    const room = await HostelRoom.findByPk(allotment.room_id, { transaction });
    if (room && Number(room.hostel_id) !== Number(hostelId)) throw new Error('Student has an active room in another hostel. Vacate that room before moving the student.');
  }
}

export async function allocationPreview(transaction) {
  const [batches, hostels, students, enrollments] = await Promise.all([
    Session.findAll({ raw: true, order: [['id', 'ASC']], transaction }),
    Hostel.findAll({ raw: true, transaction }),
    User.findAll({ include: [{ model: Role, as: 'role', required: true, where: { roleName: { [Op.in]: ['Student', 'student', 'LAPC', 'lapc'] } } }], order: [['userId', 'ASC']], transaction }),
    Enrollment.findAll({ where: { status: 'active' }, order: [['id', 'ASC']], raw: true, transaction })
  ]);
  const rows = [];
  for (const student of students) {
    const own = enrollments.filter(entry => entry.student_id === student.userId);
    if (!own.length) continue; // Allocation corrects existing residents; it never admits former students.
    const row = { student_id: student.userId, name: student.userName, roll_number: student.roll_number,
      current_batch: own.map(entry => batches.find(batch => batch.id === entry.session_id)?.name || '').join(', '),
      current_hostel: hostels.find(hostel => hostel.id === student.hostel_id)?.name || '', status: 'ready' };
    try {
      if (own.length !== 1) throw new Error('Multiple active enrollments need administrator review.');
      row.erp_batch_year = own[0].erp_batch_year;
      const batch = matchBatch(row.erp_batch_year, batches);
      row.batch_id = batch.id; row.batch = batch.name; row.hostel_id = batch.hostel_id;
      row.hostel = hostels.find(hostel => hostel.id === batch.hostel_id)?.name || '';
      if (!hostels.some(hostel => hostel.id === batch.hostel_id && hostel.is_active)) throw new Error('Assigned hostel is inactive.');
      if (own.length !== 1) throw new Error('Multiple active enrollments need administrator review.');
      if (student.hostel_id === batch.hostel_id && own[0].hostel_id === batch.hostel_id && own[0].session_id === batch.id) row.status = 'unchanged';
      else await assertCanMove(student.userId, batch.hostel_id, transaction);
    } catch (error) { row.status = 'conflict'; row.reason = error.message; }
    rows.push(row);
  }
  const token = createHash('sha256').update(JSON.stringify({ batches, enrollments, rows })).digest('hex');
  return { rows, token };
}

export async function applyAllocations(ids, token, parentTransaction) {
  return sequelize.transaction({ transaction: parentTransaction }, async transaction => {
    await lockBatchConfiguration(transaction);
    const preview = await allocationPreview(transaction);
    if (token !== preview.token) throw new Error('Allocation data changed. Refresh the preview before applying.');
    const selected = [...new Set(ids.map(Number))];
    if (!selected.length) throw new Error('Select at least one student.');
    const rows = selected.map(id => preview.rows.find(row => row.student_id === id));
    if (rows.some(row => !row || row.status !== 'ready')) throw new Error('Only students without allocation conflicts can be updated.');
    for (const row of rows) {
      await assertCanMove(row.student_id, row.hostel_id, transaction);
      await User.update({ hostel_id: row.hostel_id }, { where: { userId: row.student_id }, transaction });
      await Enrollment.update({ session_id: row.batch_id, hostel_id: row.hostel_id }, { where: { student_id: row.student_id, status: 'active' }, transaction });
    }
    return rows.length;
  });
}
