import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import jwt from 'jsonwebtoken';
import { User, Role, Hostel, Inventory, InventoryHostel } from '../models/index.js';
import { updateStaffAccess } from '../controllers/staffAccessController.js';
import { PermissionPolicy } from '../models/permissions.js';
import { defaultPermissions } from '../../shared/permissions.js';
import { auth, authorize } from '../middleware/auth.js';

const originals = [User.findByPk, Role.findByPk, Hostel.findByPk];
const originalSecret = process.env.JWT_SECRET;
after(() => {
  [User.findByPk, Role.findByPk, Hostel.findByPk] = originals;
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});
const response = () => Object.assign(new EventEmitter(), {
  code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }
});
let saved;
function fixtures(current = 'warden', target = 'mess', active = true) {
  saved = null;
  User.findByPk = async () => ({ userId: 5, roleId: 2, hostel_id: 1, update: async data => { saved = data; } });
  Role.findByPk = async id => ({ roleName: Number(id) === 2 ? current : target });
  Hostel.findByPk = async () => ({ id: 2, is_active: active });
}
test('admin can move a warden and change staff role without changing historical records', async () => {
  fixtures();
  const res = response();
  await updateStaffAccess({ params: { id: '5' }, body: { roleId: 3, hostel_id: 2, username: 'ignored' } }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(saved, { roleId: 3, hostel_id: 2 });
});
test('student accounts and admin role escalation are rejected', async () => {
  for (const [current, target] of [['student', 'mess'], ['warden', 'admin']]) {
    fixtures(current, target);
    const res = response();
    await updateStaffAccess({ params: { id: '5' }, body: { roleId: 3, hostel_id: 2 } }, res);
    assert.equal(res.code, 400);
    assert.equal(saved, null);
  }
});
test('invalid and inactive hostel assignments are rejected', async () => {
  for (const hostel_id of [null, '2junk', -1, 0, 2]) {
    fixtures('warden', 'mess', false);
    const res = response();
    await updateStaffAccess({ params: { id: '5' }, body: { roleId: 3, hostel_id } }, res);
    assert.equal(res.code, 400);
    assert.equal(saved, null);
  }
});
test('only admin can access staff settings', () => {
  for (const role of ['warden', 'mess', 'student']) {
    const res = response();
    authorize(['admin'])({ user: { role } }, res, () => assert.fail('Staff must not enter admin settings'));
    assert.equal(res.code, 403);
  }
});
test('existing tokens use the new hostel and never restore a removed assignment', async t => {
  t.mock.method(PermissionPolicy, 'findByPk', async () => ({ revision: 1, grants: defaultPermissions() }));
  process.env.JWT_SECRET = 'staff-access-test-only';
  const token = jwt.sign({ userId: 5, role: 'warden', hostelId: 1 }, process.env.JWT_SECRET);
  for (const hostel_id of [2, null]) {
    User.findByPk = async () => ({ role: { roleName: 'warden' }, hostel_id, toJSON: () => ({ userId: 5, hostel_id }) });
    const req = { header: () => `Bearer ${token}`, get: () => undefined, originalUrl: '/api/warden/students', method: 'GET' };
    let continued = false;
    await auth(req, response(), () => { continued = true; });
    assert.equal(continued, true);
    assert.equal(req.user.hostel_id, hostel_id);
  }
});
test('changing a staff role invalidates the old role token', async () => {
  process.env.JWT_SECRET = 'staff-access-test-only';
  User.findByPk = async () => ({ role: { roleName: 'mess' } });
  const token = jwt.sign({ userId: 5, role: 'warden' }, process.env.JWT_SECRET);
  const res = response();
  await auth({ header: () => `Bearer ${token}` }, res, () => assert.fail('Stale role must be rejected'));
  assert.equal(res.code, 401);
});

test('the staff workspace header resolves the assignment without changing the signed-in actor', async t => {
  process.env.JWT_SECRET = 'staff-access-test-only';
  let accountRole = 'admin';
  let accountActive = true;
  const account = { userId: 41, userName: 'Mess desk', role: { roleName: 'mess' }, Hostel: { id: 7, name: 'Hostel B' } };
  t.mock.method(User, 'findByPk', async () => ({ role: { roleName: accountRole }, toJSON: () => ({ userId: 99 }) }));
  t.mock.method(User, 'findOne', async ({ where }) => {
    assert.equal(where.status, 'Active');
    return accountActive && where.userId === 41 ? account : null;
  });
  t.mock.method(InventoryHostel, 'findByPk', async id => { assert.equal(id, 7); return { inventory_id: 10 }; });
  t.mock.method(Inventory, 'findByPk', async id => ({ id, name: 'Central stock' }));
  const run = async (workspace = 'mess', scope = '7:10') => {
    const token = jwt.sign({ userId: 99, role: accountRole }, process.env.JWT_SECRET);
    const headers = { 'X-Staff-Workspace-Id': '41', 'X-Workspace': workspace, 'X-Staff-Workspace-Scope': scope };
    const req = { header: () => `Bearer ${token}`, get: name => headers[name],
      originalUrl: '/api/mess/stock', method: 'GET' };
    const res = response();
    await auth(req, res, () => res.json({ actor: req.user.userId, role: req.user.role, scope: req.staffWorkspace }));
    return res;
  };
  assert.deepEqual((await run()).body, { actor: 99, role: 'admin', scope: { id: 41, name: 'Mess desk',
    role: 'mess', hostel: account.Hostel, inventory: { id: 10, name: 'Central stock' } } });
  assert.equal((await run('warden')).code, 409);
  assert.equal((await run('mess', '8:10')).code, 409);
  accountActive = false;
  assert.equal((await run()).code, 409);
  accountRole = 'mess';
  assert.equal((await run()).code, 403);
});
