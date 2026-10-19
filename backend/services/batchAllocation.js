import { createHash } from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { Session, Hostel, Enrollment, User, Role, RoomAllotment, HostelRoom } from '../models/index.js';

export function matchBatch(rollNumber, batches) {
  const roll = String(rollNumber ?? '').trim();
  const matches = batches.filter(batch => batch.is_active && batch.roll_prefix && roll.startsWith(batch.roll_prefix));
  if (matches.length !== 1) throw new Error(matches.length ? `Ambiguous batch for roll number ${roll}` : `No batch configured for roll number ${roll}. Ask an administrator to configure its prefix.`);
  if (!matches[0].hostel_id) throw new Error(`Assign a hostel to batch ${matches[0].name} first.`);
  return matches[0];
}

export function validateBatch(input, batches, editingId = null) {
  const start = Number(input.start_year);
  const end = Number(input.end_year);
  const prefix = String(input.roll_prefix ?? '').trim();
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 2000 || end > 2100 || end <= start) throw new Error('Enter valid start and end years. End year must be later than start year.');
  if (!/^\d{1,20}$/.test(prefix)) throw new Error('Roll number prefix must contain 1 to 20 digits.');
  if (batches.some(batch => String(batch.id) !== String(editingId) && batch.roll_prefix && (prefix.startsWith(batch.roll_prefix) || batch.roll_prefix.startsWith(prefix)))) throw new Error('This prefix duplicates or overlaps an existing batch prefix.');
  if (batches.some(batch => String(batch.id) !== String(editingId) && batch.name === `${start}-${end}`)) throw new Error('This batch already exists. Edit its existing record.');
  return { name: `${start}-${end}`, start_date: `${start}-06-01`, end_date: `${end}-05-31`, roll_prefix: prefix, hostel_id: Number(input.hostel_id), is_active: input.is_active !== false };
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

export async function resolveStudentBatch(rollNumber, actor, transaction) {
  if (transaction) await lockBatchConfiguration(transaction);
  const batch = matchBatch(rollNumber, await Session.findAll({ transaction, lock: transaction?.LOCK.SHARE }));
  const hostel = await Hostel.findByPk(batch.hostel_id, { transaction });
  if (!hostel?.is_active) throw new Error(`Hostel assigned to batch ${batch.name} is inactive.`);
  const actorHostel = actor.hostel_id || actor.hostelId;
  if (actor.role !== 'admin' && Number(actorHostel) !== batch.hostel_id) throw new Error(`Roll ${rollNumber} belongs to ${batch.name} in ${hostel.name}. You can only enroll students in your assigned hostel.`);
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
      const batch = matchBatch(student.roll_number, batches);
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
