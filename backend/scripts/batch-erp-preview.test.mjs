import assert from 'node:assert/strict';
import { initAssociations, Session, Hostel, Enrollment, RoomAllotment } from '../models/index.js';
import { getErpSyncStatus, getStudents } from '../controllers/wardenController.js';
initAssociations();
// Synthetic ERP and configuration fixtures; no ERP calls or database writes.
const originals = { fetch: global.fetch, sessions: Session.findAll, hostels: Hostel.findAll, enrollments: Enrollment.findAll, rooms: RoomAllotment.findAll };
const batches = [
  { id: 1, name: '2024-2028', erp_batch_year: 2024, gender: 'male', hostel_id: 2, is_active: true },
  { id: 2, name: '2024-2028', erp_batch_year: 2024, gender: 'female', hostel_id: 3, is_active: true },
  { id: 3, name: '2025-2029', erp_batch_year: 2025, gender: 'male', hostel_id: 4, is_active: true }
];
const response = () => ({ status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
try {
  Session.findAll = async () => batches.map(batch => ({ ...batch, toJSON: () => batch }));
  Hostel.findAll = async () => [{ id: 2, name: 'Maple House', is_active: true }, { id: 3, name: 'Cedar House', is_active: true }, { id: 4, name: 'Pine House', is_active: true }];
  Enrollment.findAll = async () => [];
  RoomAllotment.findAll = async () => [];
  global.fetch = async () => ({ ok: true, json: async () => [
    { id: 'male', studentName: 'MALE MATCH', registerNumber: '239999001', gender: 'M', batch: 2024, student_type: 'Hosteller' },
    { id: 'female', studentName: 'FEMALE MATCH', registerNumber: '239999002', gender: 'Female', batch: 2024, student_type: 'Hosteller' },
    { id: 'other-year', studentName: 'OTHER YEAR', registerNumber: '239999003', gender: 'male', batch: 2025, student_type: 'Hosteller' },
    { id: 'unmatched', studentName: 'UNMATCHED', registerNumber: '239999004', gender: 'male', batch: 2096, student_type: 'Hosteller' },
    { id: 'missing-gender', studentName: 'NO GENDER', registerNumber: '239999005', batch: 2024, student_type: 'Hosteller' },
    { id: 'day', studentName: 'DAY SCHOLAR', registerNumber: '239999006', gender: 'male', batch: 2024, student_type: 'Day Scholar' }
  ] });
  for (const [hostelId, expected] of [[2, 'male'], [3, 'female'], [4, 'other-year']]) {
    const candidates = response();
    await getStudents({ user: { role: 'warden', hostel_id: hostelId }, query: { source: 'erp' }, headers: {} }, candidates);
    assert.equal(candidates.body.success, true, candidates.body.message);
    assert.deepEqual(candidates.body.data.map(row => row.id), [expected]);
    const preview = response();
    await getErpSyncStatus({ user: { role: 'warden', hostel_id: hostelId }, headers: {} }, preview);
    assert.equal(preview.body.success, true, preview.body.message);
    assert.deepEqual(preview.body.data.newStudents.map(row => row.id), [expected]);
  }
  const unassigned = response();
  await getStudents({ user: { role: 'warden' }, query: { source: 'erp' }, headers: {} }, unassigned);
  assert.equal(unassigned.code, 403);
  console.log('PASS: ERP fetch and sync preview follow current hostel, batch year and gender; missing gender and other hostels are excluded.');
} finally {
  global.fetch = originals.fetch;
  Session.findAll = originals.sessions; Hostel.findAll = originals.hostels;
  Enrollment.findAll = originals.enrollments; RoomAllotment.findAll = originals.rooms;
}
