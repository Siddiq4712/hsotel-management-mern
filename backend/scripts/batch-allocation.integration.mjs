import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { initAssociations, Session, User, Role, Hostel, Enrollment, MessBill } from '../models/index.js';
import { allocationPreview, applyAllocations, resolveStudentBatch } from '../services/batchAllocation.js';
import { enrollStudent, bulkEnrollStudents } from '../controllers/wardenController.js';
import { saveBatch } from '../controllers/batchController.js';
initAssociations();
const transaction = await sequelize.transaction();
try {
  const role = await Role.findOne({ where: { roleName: 'Student' }, transaction });
  const hostels = await Hostel.findAll({ where: { is_active: true }, order: [['id', 'ASC']], transaction });
  assert.ok(hostels.length >= 2);
  const target = hostels[1], origin = hostels[0];
  const oldBatch = await Session.findOne({ transaction });
  const batch = await Session.create({ name: '2098-2099 TEST', erp_batch_year: 2098, gender: 'male', hostel_id: target.id, start_date: '2098-06-01', end_date: '2099-05-31' }, { transaction });
  const femaleBatch = await Session.create({ name: batch.name, erp_batch_year: 2098, gender: 'female', hostel_id: origin.id, start_date: '2098-06-01', end_date: '2099-05-31' }, { transaction });
  const lapcBatch = await Session.create({ name: '2098-2100 LAPC TEST', college: 'lapc', erp_batch_year: 2098, gender: 'male', hostel_id: origin.id, start_date: '2098-06-01', end_date: '2100-05-31' }, { transaction });
  assert.equal((await resolveStudentBatch(2098, { role: 'admin' }, transaction, 'male', 'lapc')).id, lapcBatch.id);
  assert.equal((await resolveStudentBatch(2098, { role: 'warden', hostel_id: origin.id }, transaction, 'F')).id, femaleBatch.id);
  await assert.rejects(resolveStudentBatch(2098, { role: 'warden', hostel_id: target.id }, transaction, 'female'), /only enroll/);
  const student = await User.create({ userName: 'BATCH ALLOCATION TEST', gender: 'male', userMail: `batch-${Date.now()}@test.invalid`, password: 'not-a-login', roll_number: '981234001', roleId: role.roleId, hostel_id: origin.id }, { transaction });
  await Enrollment.create({ student_id: student.userId, session_id: oldBatch.id, erp_batch_year: 2098, hostel_id: origin.id, roll_number: student.roll_number }, { transaction });
  const bill = await MessBill.create({ student_id: student.userId, hostel_id: origin.id, month: 8, year: 2026, amount: 123, status: 'pending', due_date: '2026-09-07' }, { transaction });
  const lapcResident = await User.create({ userName: 'LAPC ALLOCATION TEST', gender: 'male', userMail: `lapc-batch-${Date.now()}@test.invalid`, password: 'not-a-login', roll_number: 'LAPC-ALLOCATION-TEST', roleId: role.roleId, hostel_id: target.id }, { transaction });
  await Enrollment.create({ student_id: lapcResident.userId, session_id: batch.id, college: 'lapc', erp_batch_year: 2098, hostel_id: target.id, roll_number: lapcResident.roll_number }, { transaction });
  assert.equal((await resolveStudentBatch(2098, { role: 'admin' }, transaction, 'male')).id, batch.id);
  await assert.rejects(resolveStudentBatch(2098, { role: 'warden', hostel_id: origin.id }, transaction, 'male'), /only enroll/);
  const preview = await allocationPreview(transaction);
  assert.equal(preview.rows.find(row => row.student_id === student.userId).status, 'ready');
  const lapcPreview = preview.rows.find(row => row.student_id === lapcResident.userId);
  assert.equal(lapcPreview.college, 'lapc');
  assert.equal(lapcPreview.batch_id, lapcBatch.id);
  await assert.rejects(applyAllocations([student.userId], 'stale', transaction), /changed/);
  assert.equal(await applyAllocations([student.userId, lapcResident.userId], preview.token, transaction), 2);
  await lapcResident.reload({ transaction });
  assert.equal(lapcResident.hostel_id, origin.id);
  assert.equal((await Enrollment.findOne({ where: { student_id: lapcResident.userId }, transaction })).session_id, lapcBatch.id);
  await student.reload({ transaction });
  assert.equal(student.hostel_id, target.id);
  const enrollment = await Enrollment.findOne({ where: { student_id: student.userId }, transaction });
  assert.equal(enrollment.session_id, batch.id);
  assert.equal(enrollment.erp_batch_year, 2098);
  assert.equal(enrollment.hostel_id, target.id);
  await bill.reload({ transaction });
  assert.equal(bill.hostel_id, origin.id);
  assert.equal(Number(bill.amount), 123);
  await Session.create({ name: '2097-2098 TEST', erp_batch_year: 2097, gender: 'male', hostel_id: origin.id, start_date: '2097-06-01', end_date: '2098-05-31' }, { transaction });
  // Keep the actual admission controllers and their nested savepoints inside
  // this test's rollback boundary, including controllers using unmanaged transactions.
  const nativeTransaction = sequelize.transaction.bind(sequelize);
  sequelize.transaction = (options, callback) => typeof options === 'function'
    ? nativeTransaction({ transaction }, options)
    : nativeTransaction({ ...options, transaction: options?.transaction || transaction }, callback);
  const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  try {
    const missingYear = response();
    await enrollStudent({ user: { role: 'admin' }, body: { userName: 'MISSING YEAR', roll_number: '981234009', session_id: batch.id } }, missingYear);
    assert.equal(missingYear.code, 400);
    assert.equal(await User.count({ where: { roll_number: '981234009' }, transaction }), 0);
    const manualLapc = response();
    await enrollStudent({ user: { role: 'admin' }, body: { userName: 'MANUAL LAPC BLOCKED', roll_number: 'LAPC-MANUAL-TEST', college: 'lapc', batch: 2098, gender: 'male' } }, manualLapc);
    assert.equal(manualLapc.code, 400);
    assert.match(manualLapc.body.message, /Excel/);
    const apiLapc = response();
    await bulkEnrollStudents({ user: { role: 'admin' }, body: { import_source: 'api', students: [{ name: 'API LAPC BLOCKED', roll_number: 'LAPC-API-TEST', college: 'lapc', batch: 2098, gender: 'male' }] } }, apiLapc);
    assert.equal(apiLapc.body.data.successful, 0);
    assert.match(apiLapc.body.data.errors[0].error, /Excel/);
    assert.equal(await User.count({ where: { roll_number: ['LAPC-MANUAL-TEST', 'LAPC-API-TEST'] }, transaction }), 0);
    const single = response();
    await enrollStudent({ user: { role: 'admin' }, body: { userName: 'SINGLE BATCH TEST', roll_number: '981234002', batch: 2098, gender: 'male', session_id: oldBatch.id, requires_bed: true } }, single);
    assert.equal(single.code, 201, single.body?.message);
    const admitted = await User.findOne({ where: { roll_number: '981234002' }, transaction });
    assert.equal(admitted.hostel_id, target.id);
    assert.equal((await Enrollment.findOne({ where: { student_id: admitted.userId }, transaction })).session_id, batch.id);
    const bulk = response();
    await bulkEnrollStudents({ user: { role: 'admin' }, body: { import_source: 'excel', default_password: 'TestImportPass', session_id: oldBatch.id, students: [
      { name: 'BULK TARGET TEST', roll_number: '981234003', batch: 2098, gender: 'male' },
      { name: 'BULK ORIGIN TEST', roll_number: '982234003', batch: 2097, gender: 'male' },
      { name: 'FEMALE SAME YEAR TEST', roll_number: '983234003', batch: 2098, gender: 'female' },
      { name: 'LAPC SAME YEAR TEST', roll_number: 'LAPC-EXCEL-TEST', college: 'lapc', batch: 2098, gender: 'male' },
      { name: 'LAPC NO FALLBACK TEST', roll_number: 'LAPC-NO-FALLBACK-TEST', college: 'lapc', batch: 2097, gender: 'male' },
      { name: 'UNMATCHED TEST', roll_number: '989999003', batch: 2096, gender: 'male' }
    ] } }, bulk);
    assert.equal(bulk.body?.data?.successful, 4, JSON.stringify(bulk.body));
    assert.equal(bulk.body?.data?.errors.length, 2);
    const lapcImported = await User.findOne({ where: { roll_number: 'LAPC-EXCEL-TEST' }, transaction });
    assert.equal(lapcImported.roleId, role.roleId);
    assert.equal(lapcImported.hostel_id, origin.id);
    const lapcEnrollment = await Enrollment.findOne({ where: { student_id: lapcImported.userId }, transaction });
    assert.equal(lapcEnrollment.college, 'lapc');
    assert.equal(lapcEnrollment.session_id, lapcBatch.id);
    assert.equal(await User.count({ where: { roll_number: 'LAPC-NO-FALLBACK-TEST' }, transaction }), 0);
    assert.equal((await User.findOne({ where: { roll_number: '981234003' }, transaction })).hostel_id, target.id);
    assert.equal((await User.findOne({ where: { roll_number: '982234003' }, transaction })).hostel_id, origin.id);
    const femaleStudent = await User.findOne({ where: { roll_number: '983234003' }, transaction });
    assert.equal(femaleStudent.gender, 'female');
    assert.equal(femaleStudent.hostel_id, origin.id);
    assert.equal((await Enrollment.findOne({ where: { student_id: femaleStudent.userId }, transaction })).session_id, femaleBatch.id);
    assert.equal(await User.count({ where: { roll_number: '989999003' }, transaction }), 0);
    const wrongHostel = response();
    await bulkEnrollStudents({ user: { role: 'warden', hostel_id: target.id }, body: { import_source: 'excel', default_password: 'TestImportPass', college: 'lapc', students: [{ name: 'WRONG HOSTEL LAPC', roll_number: 'LAPC-SCOPE-TEST', batch: 2098, gender: 'male' }] } }, wrongHostel);
    assert.equal(wrongHostel.body.data.successful, 0);
    assert.match(wrongHostel.body.data.errors[0].error, /only enroll/);
    const otherBatch = await Session.findOne({ where: { erp_batch_year: 2097, college: 'nec' }, transaction });
    const retag = response();
    await saveBatch({ params: { id: otherBatch.id }, body: { college: 'lapc', start_year: 2097, end_year: 2100, gender: 'male', hostel_id: origin.id } }, retag);
    assert.equal(retag.code, 400);
    assert.match(retag.body.message, /active students/);
    console.log('PASS: matching, role scope, stale previews, allocation, historical bills, single admission and mixed-hostel bulk import');
  } finally { sequelize.transaction = nativeTransaction; }
} finally {
  await transaction.rollback();
  await sequelize.close();
  console.log('All integration fixtures rolled back.');
}
