import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { User, Role, Enrollment, Session, Hostel, RoomAllotment, sequelize } from '../models/index.js';
import { bulkEnrollStudents, syncErpRecords } from '../controllers/wardenController.js';

const patches = [];
const patch = (object, key, value) => { patches.push([object, key, object[key]]); object[key] = value; };
after(() => { for (const [object, key, value] of patches.reverse()) object[key] = value; });
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const student = { userName: 'EXAMPLE STUDENT', roll_number: '24100001', erp_batch_year: 2024, gender: 'male', date_of_birth: '2006-02-01' };
function fixtures({ existing = false, dob = '2006-02-01' } = {}) {
  const created = [], updated = [];
  const transaction = { LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' }, commit: async () => {}, rollback: async () => {} };
  const batch = { id: 3, hostel_id: 2, erp_batch_year: 2024, gender: 'male', name: '2024-2028', is_active: true };
  patch(sequelize, 'transaction', async (options, fn) => fn ? fn(transaction) : transaction);
  patch(Role, 'findOne', async () => ({ roleId: 1 }));
  patch(Role, 'findAll', async () => [{ roleId: 1 }]);
  patch(Session, 'findAll', async () => [{ ...batch, toJSON: () => batch }]);
  patch(Hostel, 'findAll', async () => [{ id: 2, name: 'Hostel II', is_active: true }]);
  patch(Hostel, 'findByPk', async () => ({ id: 2, name: 'Hostel II', is_active: true }));
  patch(Enrollment, 'findAll', async () => []);
  patch(Enrollment, 'findOne', async () => null);
  patch(Enrollment, 'create', async data => data);
  patch(RoomAllotment, 'findAll', async () => []);
  patch(User, 'findOne', async () => existing ? { userId: 7, roleId: 1, password: 'existing-hash', update: async data => updated.push(data) } : null);
  patch(User, 'create', async data => { created.push(data); return { userId: 7, ...data }; });
  patch(global, 'fetch', async () => ({ ok: true, json: async () => [{ studentName: student.userName, registerNumber: student.roll_number, student_type: 'Hosteller', batch: 2024, gender: 'male', dateOfBirth: dob }] }));
  return { created, updated };
}
async function invoke(sync, dob = '2006-02-01', settings = {}) {
  const res = response();
  const req = { user: { role: 'warden', hostel_id: 2 }, headers: {}, body: { students: [{ ...student, date_of_birth: dob }], ...settings } };
  await (sync ? syncErpRecords : bulkEnrollStudents)(req, res);
  return res;
}
for (const sync of [false, true]) {
  const label = sync ? 'ERP sync' : 'Selected API bulk import';
  test(`${label} hashes DDMMYYYY for a new student`, async () => {
    const f = fixtures();
    const res = await invoke(sync);
    assert.equal(res.code, 200);
    assert.equal(f.created.length, 1);
    assert.notEqual(f.created[0].password, '01022006');
    assert.equal(await bcrypt.compare('01022006', f.created[0].password), true);
    assert.equal(await bcrypt.compare('12345678', f.created[0].password), false);
  });
  test(`${label} reports missing DOB without creating credentials`, async () => {
    const f = fixtures({ dob: '' });
    const res = await invoke(sync, '');
    assert.equal(f.created.length, 0);
    assert.equal(res.body.data.errors.length, 1);
  });
  test(`${label} preserves existing passwords even when DOB is missing`, async () => {
    const f = fixtures({ existing: true, dob: '' });
    const res = await invoke(sync, '');
    assert.equal(res.body.data.errors.length, 0);
    assert.equal(f.created.length, 0);
    assert.equal(f.updated.length, 1);
    assert.equal(Object.hasOwn(f.updated[0], 'password'), false);
  });
}

test('Excel imports hash the warden password without requiring DOB', async () => {
  const f = fixtures({ dob: '' });
  const res = await invoke(false, '', { import_source: 'excel', default_password: 'WardenTestPass' });
  assert.equal(res.code, 200);
  assert.equal(f.created.length, 1);
  assert.equal(await bcrypt.compare('WardenTestPass', f.created[0].password), true);
  assert.notEqual(f.created[0].password, 'WardenTestPass');
});
test('Excel imports reject a missing or short default password', async () => {
  for (const password of [undefined, '', '12345']) {
    const f = fixtures();
    const res = await invoke(false, '', { import_source: 'excel', default_password: password });
    assert.equal(res.code, 400);
    assert.equal(f.created.length, 0);
  }
});
test('Excel reimports preserve existing passwords', async () => {
  const f = fixtures({ existing: true, dob: '' });
  const res = await invoke(false, '', { import_source: 'excel', default_password: 'WardenTestPass' });
  assert.equal(res.body.data.errors.length, 0);
  assert.equal(f.created.length, 0);
  assert.equal(Object.hasOwn(f.updated[0], 'password'), false);
});
test('an API import cannot substitute the Excel password for a missing DOB', async () => {
  const f = fixtures({ dob: '' });
  const res = await invoke(false, '', { import_source: 'api', default_password: 'WardenTestPass' });
  assert.equal(f.created.length, 0);
  assert.equal(res.body.data.errors.length, 1);
});
