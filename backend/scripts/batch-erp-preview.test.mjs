import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { initAssociations } from '../models/index.js';
import { getErpSyncStatus, getStudents } from '../controllers/wardenController.js';
initAssociations();
const originalFetch = global.fetch;
try {
  // Synthetic ERP responses; this test does not contact or modify the ERP.
  let fetchCount = 0;
  global.fetch = async () => { fetchCount++; return { ok: true, json: async () => [
    { id: 'batch-preview-existing', username: 'B.HARIRAAM', roll_number: '24104085', gender: 'male', student_type: 'hosteller', college: 'nec', batch: 2024 },
    { id: 'batch-preview-new', studentName: 'ERP YEAR PREVIEW TEST', roll_number: '239999999999', gender: 'male', student_type: 'hosteller', college: 'nec', batch: 2024 },
    { id: 'batch-preview-unmatched', username: 'UNMATCHED PREVIEW TEST', roll_number: '991234567890', gender: 'male', student_type: 'hosteller', college: 'nec', batch: 2096 },
    { id: 'other-hostel', studentName: 'OTHER HOSTEL', registerNumber: '241234567891', student_type: 'Hosteller', batch: 2025 }
  ] }; };
  const response = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  await getErpSyncStatus({ user: { role: 'warden', hostel_id: 2 }, headers: {} }, response);
  assert.equal(response.body.success, true, response.body.message);
  const data = response.body.data;
  const student = data.newStudents.find(row => row.roll_number === '239999999999');
  assert.equal(student.batch, '2024-2028');
  assert.equal(student.name, 'ERP YEAR PREVIEW TEST');
  assert.equal(student.erp_batch_year, 2024);
  assert.equal(student.assigned_hostel, 'BOYS HOSTEL 2');
  assert.equal(data.allocationConflicts.length, 1);
  assert.match(data.allocationConflicts[0].reason, /No batch configured/);
  assert.equal(data.updatedStudents.some(row => row.roll_number === '24104085'), false);
  assert.equal(data.newStudents.some(row => row.id === 'other-hostel'), false);
  const responseObject = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
  const local = responseObject();
  await getStudents({ user: { role: 'warden', hostel_id: 2 }, query: {}, headers: {} }, local);
  assert.equal(local.body.success, true, local.body.message);
  assert.equal(fetchCount, 1, 'Normal student roster must not fetch ERP records');
  const saved = local.body.data.find(row => row.roll_number === '24104085');
  assert.equal(saved.erp_batch_year, 2024);
  const candidates = responseObject();
  await getStudents({ user: { role: 'warden', hostel_id: 2 }, query: { source: 'erp' }, headers: {} }, candidates);
  assert.equal(candidates.body.success, true, candidates.body.message);
  assert.ok(candidates.body.data.some(row => row.roll_number === '239999999999'));
  assert.equal(candidates.body.data.some(row => row.id === 'other-hostel'), false);
  console.log('PASS: ERP preview uses the ERP admission year even when the roll prefix differs, maps studentName and reports unmatched years.');
} finally {
  global.fetch = originalFetch;
  await sequelize.close();
}
