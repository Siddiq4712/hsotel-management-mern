import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { initAssociations, Session, User, Role, Enrollment } from '../models/index.js';
import { listBatches } from '../services/batchAllocation.js';

initAssociations();
let transaction;
try {
  transaction = await sequelize.transaction();
  const batch = await Session.findOne({ where: { is_active: true }, transaction });
  const role = await Role.findOne({ where: { roleName: 'Student' }, transaction });
  assert.ok(batch?.hostel_id && role, 'An allocated batch and Student role are required');
  const count = async () => (await listBatches(transaction)).find(row => row.id === batch.id).student_count;
  const baseline = await count();
  const unique = `count-${Date.now()}`;
  const student = await User.create({ userName: 'BATCH COUNT REGRESSION', userMail: `${unique}@test.invalid`, password: 'not-a-login', roll_number: unique, roleId: role.roleId, hostel_id: batch.hostel_id, status: 'Active' }, { transaction });
  const enrollment = await Enrollment.create({ student_id: student.userId, session_id: batch.id, hostel_id: batch.hostel_id, roll_number: unique, status: 'active' }, { transaction });
  assert.equal(await count(), baseline + 1, 'Active enrolled students are counted');
  // User deletion retains the account and enrollment for historical records.
  await student.update({ status: 'Inactive' }, { transaction });
  assert.equal(await count(), baseline, 'Deleted accounts are excluded even with an active enrollment');
  await enrollment.reload({ transaction });
  assert.equal(enrollment.status, 'active', 'Counting must preserve enrollment history');
  await student.update({ status: 'Active' }, { transaction });
  await enrollment.update({ status: 'inactive' }, { transaction });
  assert.equal(await count(), baseline, 'Inactive enrollments are also excluded');
  console.log('PASS: active batch counts exclude deleted users and inactive enrollments; history preserved.');
} finally {
  if (transaction) await transaction.rollback();
  await sequelize.close();
}
