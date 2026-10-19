import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { initAssociations } from '../models/index.js';
import { getErpSyncStatus } from '../controllers/wardenController.js';
initAssociations();
const originalFetch = global.fetch;
try {
  // Synthetic ERP responses; this test does not contact or modify the ERP.
  global.fetch = async () => ({ ok: true, json: async () => [
    { id: 'batch-preview-existing', username: 'B.HARIRAAM', roll_number: '24104085', gender: 'male', student_type: 'hosteller', college: 'nec', batch: 'Wrong source batch' },
    { id: 'batch-preview-new', username: 'PREFIX PREVIEW TEST', roll_number: '249999999999', gender: 'male', student_type: 'hosteller', college: 'nec', batch: 'Wrong source batch' },
    { id: 'batch-preview-unmatched', username: 'UNMATCHED PREVIEW TEST', roll_number: '991234567890', gender: 'male', student_type: 'hosteller', college: 'nec' }
  ] });
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await getErpSyncStatus({ user: { role: 'warden', hostel_id: 2 }, headers: {} }, response);
  assert.equal(response.body.success, true, response.body.message);
  const data = response.body.data;
  const student = data.newStudents.find(row => row.roll_number === '249999999999');
  assert.equal(student.batch, '2024-2028');
  assert.equal(student.assigned_hostel, 'BOYS HOSTEL 2');
  assert.equal(data.allocationConflicts.length, 1);
  assert.match(data.allocationConflicts[0].reason, /No batch configured/);
  assert.equal(data.updatedStudents.some(row => row.roll_number === '24104085'), false);
  console.log('PASS: ERP preview uses configured prefixes, ignores conflicting source batch labels and reports unmatched rolls.');
} finally {
  global.fetch = originalFetch;
  await sequelize.close();
}
