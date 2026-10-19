import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { initAssociations, Session, User, Role, Hostel, Enrollment, MessBill } from '../models/index.js';
import { allocationPreview, applyAllocations, resolveStudentBatch } from '../services/batchAllocation.js';
import { enrollStudent, bulkEnrollStudents } from '../controllers/wardenController.js';
initAssociations();
const transaction = await sequelize.transaction();
try {
  const role = await Role.findOne({ where: { roleName: 'Student' }, transaction });
  const hostels = await Hostel.findAll({ where: { is_active: true }, order: [['id', 'ASC']], transaction });
  assert.ok(hostels.length >= 2);
  const target = hostels[1], origin = hostels[0];
  const oldBatch = await Session.findOne({ transaction });
  const batch = await Session.create({ name: '2098-2099 TEST', roll_prefix: '981234', hostel_id: target.id, start_date: '2098-06-01', end_date: '2099-05-31' }, { transaction });
  const student = await User.create({ userName: 'BATCH ALLOCATION TEST', userMail: `batch-${Date.now()}@test.invalid`, password: 'not-a-login', roll_number: '981234001', roleId: role.roleId, hostel_id: origin.id }, { transaction });
  await Enrollment.create({ student_id: student.userId, session_id: oldBatch.id, hostel_id: origin.id, roll_number: student.roll_number }, { transaction });
  const bill = await MessBill.create({ student_id: student.userId, hostel_id: origin.id, month: 8, year: 2026, amount: 123, status: 'pending', due_date: '2026-09-07' }, { transaction });
  assert.equal((await resolveStudentBatch(student.roll_number, { role: 'admin' }, transaction)).id, batch.id);
  await assert.rejects(resolveStudentBatch(student.roll_number, { role: 'warden', hostel_id: origin.id }, transaction), /only enroll/);
  const preview = await allocationPreview(transaction);
  assert.equal(preview.rows.find(row => row.student_id === student.userId).status, 'ready');
  await assert.rejects(applyAllocations([student.userId], 'stale', transaction), /changed/);
  assert.equal(await applyAllocations([student.userId], preview.token, transaction), 1);
  await student.reload({ transaction });
  assert.equal(student.hostel_id, target.id);
  const enrollment = await Enrollment.findOne({ where: { student_id: student.userId }, transaction });
  assert.equal(enrollment.session_id, batch.id);
  assert.equal(enrollment.hostel_id, target.id);
  await bill.reload({ transaction });
  assert.equal(bill.hostel_id, origin.id);
  assert.equal(Number(bill.amount), 123);
  await Session.create({ name: '2097-2098 TEST', roll_prefix: '982234', hostel_id: origin.id, start_date: '2097-06-01', end_date: '2098-05-31' }, { transaction });
  // Keep the actual admission controllers and their nested savepoints inside
  // this test's rollback boundary, including controllers using unmanaged transactions.
  const nativeTransaction = sequelize.transaction.bind(sequelize);
  sequelize.transaction = (options, callback) => typeof options === 'function'
    ? nativeTransaction({ transaction }, options)
    : nativeTransaction({ ...options, transaction: options?.transaction || transaction }, callback);
  const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  try {
    const single = response();
    await enrollStudent({ user: { role: 'admin' }, body: { userName: 'SINGLE BATCH TEST', roll_number: '981234002', session_id: oldBatch.id, requires_bed: true } }, single);
    assert.equal(single.code, 201, single.body?.message);
    const admitted = await User.findOne({ where: { roll_number: '981234002' }, transaction });
    assert.equal(admitted.hostel_id, target.id);
    assert.equal((await Enrollment.findOne({ where: { student_id: admitted.userId }, transaction })).session_id, batch.id);
    const bulk = response();
    await bulkEnrollStudents({ user: { role: 'admin' }, body: { session_id: oldBatch.id, students: [
      { name: 'BULK TARGET TEST', roll_number: '981234003' },
      { name: 'BULK ORIGIN TEST', roll_number: '982234003' },
      { name: 'UNMATCHED TEST', roll_number: '989999003' }
    ] } }, bulk);
    assert.equal(bulk.body?.data?.successful, 2, JSON.stringify(bulk.body));
    assert.equal(bulk.body?.data?.errors.length, 1);
    assert.equal((await User.findOne({ where: { roll_number: '981234003' }, transaction })).hostel_id, target.id);
    assert.equal((await User.findOne({ where: { roll_number: '982234003' }, transaction })).hostel_id, origin.id);
    assert.equal(await User.count({ where: { roll_number: '989999003' }, transaction }), 0);
    console.log('PASS: matching, role scope, stale previews, allocation, historical bills, single admission and mixed-hostel bulk import');
  } finally { sequelize.transaction = nativeTransaction; }
} finally {
  await transaction.rollback();
  await sequelize.close();
  console.log('All integration fixtures rolled back.');
}
