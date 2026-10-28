import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import { normalizeRole } from '../../shared/roles.js';
import { defaultPermissions } from '../../shared/permissions.js';
import { auth, authorize } from '../middleware/auth.js';
import { canAccessRole } from '../utils/workspacePermissions.js';
import { User, Role, Fee, AdditionalIncome, MessDailyExpense, OtherExpense, HostelMaintenance } from '../models/index.js';
import { PermissionPolicy } from '../models/permissions.js';
import { login } from '../controllers/authController.js';
import { getRoles, createRole, getUsers, getAdminChartData } from '../controllers/adminController.js';

const secret = 'student-role-alias-test-only';
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(value) { this.body = value; return this; } });
const account = roleName => ({ userId: 17, userName: 'Legacy student test', userMail: 'legacy@example.test', roleId: 40, hostel_id: 8,
  role: { roleName }, toJSON() { return { userId: this.userId, roleId: this.roleId, role: this.role, hostel_id: this.hostel_id }; } });
const patch = (context, object, name, value) => context.mock.method(object, name, value);
async function authenticate(context, dbRole, tokenRole, grants = defaultPermissions()) {
  const previous = process.env.JWT_SECRET;
  process.env.JWT_SECRET = secret;
  context.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  patch(context, User, 'findByPk', async () => account(dbRole));
  patch(context, PermissionPolicy, 'findByPk', async () => ({ revision: 2, grants }));
  const payload = { userId: 17, ...(tokenRole ? { role: tokenRole } : {}) };
  const token = jwt.sign(payload, secret, { expiresIn: '5m' });
  const req = { header: () => `Bearer ${token}`, originalUrl: '/api/student/profile', method: 'GET' };
  const res = response(); let reachedStudentRoute = false;
  await auth(req, res, () => authorize(['student'])(req, res, () => { reachedStudentRoute = true; }));
  return { req, res, reachedStudentRoute };
}

test('LAPC normalizes to Student without granting staff access', () => {
  for (const value of ['lapc', 'LAPC', ' LAPC ', { roleName: 'LAPC' }]) assert.equal(normalizeRole(value), 'student');
  assert.equal(canAccessRole('lapc', ['student']), true);
  assert.equal(canAccessRole('student', ['lapc']), true); // Compatibility with older callers.
  for (const role of ['admin', 'warden', 'mess', 'security', 'parent']) assert.equal(canAccessRole('lapc', [role]), false);
  assert.equal(normalizeRole('__proto__'), '__proto__');
});
test('Student JWTs work with legacy LAPC database accounts and preserve hostel scope', async context => {
  const result = await authenticate(context, 'LAPC', 'student');
  assert.equal(result.res.code, 200); assert.equal(result.reachedStudentRoute, true);
  assert.equal(result.req.user.role, 'student'); assert.equal(result.req.user.hostel_id, 8);
});
test('old LAPC JWTs remain valid for accounts stored as Student', async context => {
  const result = await authenticate(context, 'Student', 'lapc');
  assert.equal(result.reachedStudentRoute, true); assert.equal(result.req.user.role, 'student');
});
test('OAuth tokens without a role resolve legacy LAPC accounts to Student', async context => {
  const result = await authenticate(context, 'LAPC', null);
  assert.equal(result.reachedStudentRoute, true); assert.equal(result.req.user.role, 'student');
});
test('a real token/DB role mismatch remains rejected', async context => {
  const result = await authenticate(context, 'LAPC', 'warden');
  assert.equal(result.res.code, 401); assert.equal(result.reachedStudentRoute, false);
});
test('Student permission revocation also blocks legacy LAPC accounts', async context => {
  const grants = defaultPermissions();
  grants.student['my-profile'] = [];
  // Profile is a supporting lookup; remove its dependent Student screens as well.
  for (const id of Object.keys(grants.student)) grants.student[id] = [];
  grants.lapc = { 'my-profile': ['view', 'edit'] };
  const result = await authenticate(context, 'LAPC', 'lapc', grants);
  assert.equal(result.res.code, 403); assert.equal(result.reachedStudentRoute, false);
});
test('login issues a Student role and token for a legacy LAPC account', async context => {
  const previous = process.env.JWT_SECRET; process.env.JWT_SECRET = secret;
  context.after(() => { if (previous === undefined) delete process.env.JWT_SECRET; else process.env.JWT_SECRET = previous; });
  const user = account('LAPC'); user.password = await bcrypt.hash('synthetic-test-password', 4);
  patch(context, User, 'findOne', async () => user);
  const res = response(); await login({ body: { username: user.userName, password: 'synthetic-test-password' } }, res);
  assert.equal(res.code, 200); assert.equal(res.body.user.role, 'student');
  assert.equal(jwt.verify(res.body.token, secret).role, 'student');
});
test('role selection hides LAPC and creating the alias reuses Student', async context => {
  const student = { roleId: 3, roleName: 'Student', status: 'Active' };
  patch(context, Role, 'findAll', async () => [student, { roleId: 40, roleName: 'LAPC', status: 'Active' }]);
  patch(context, Role, 'findOne', async ({ where }) => { assert.equal(where.logic, 'student'); return student; });
  patch(context, Role, 'create', async () => { assert.fail('Must not create a separate LAPC role.'); });
  const list = response(); await getRoles({}, list);
  assert.deepEqual(list.body.data, [student]);
  const created = response(); await createRole({ body: { roleName: 'LAPC' }, user: { userId: 1 } }, created);
  assert.equal(created.code, 200); assert.equal(created.body.data.roleName, 'Student');
});
test('Student user filters include legacy role IDs and return the Student label', async context => {
  patch(context, User, 'findAll', async options => {
    assert.deepEqual(options.include[0].where.logic[Op.in], ['student', 'lapc']);
    return [account('Student'), account('LAPC')];
  });
  for (const role of ['Student', 'LAPC']) {
    const res = response(); await getUsers({ query: { role } }, res);
    assert.equal(res.code, 200); assert.deepEqual(res.body.data.map(user => user.role.roleName), ['Student', 'Student']);
  }
});
test('admin role charts combine Student and legacy LAPC counts', async context => {
  patch(context, Role, 'findAll', async () => [{ roleId: 3, roleName: 'Student' }, { roleId: 40, roleName: 'LAPC' }, { roleId: 2, roleName: 'Warden' }]);
  patch(context, User, 'findAll', async () => [{ roleId: 3, count: '5' }, { roleId: 40, count: '2' }, { roleId: 2, count: '1' }]);
  for (const model of [Fee, AdditionalIncome, MessDailyExpense, OtherExpense, HostelMaintenance]) patch(context, model, 'sum', async () => 0);
  patch(context, HostelMaintenance, 'findAll', async () => []);
  const res = response(); await getAdminChartData({}, res);
  assert.equal(res.code, 200); assert.deepEqual(res.body.data.userRoles, { labels: ['Student', 'Warden'], counts: [7, 1] });
});
