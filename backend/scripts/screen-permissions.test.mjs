import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ROLE_LABELS, SCREENS, screenById, defaultPermissions, can, validatePermissions, permissionChanges, normalizeActions, screenForView } from '../../shared/permissions.js';
import { apiPermission, canCallApi } from '../../shared/permissionRoutes.js';
import { createPermissionEnforcer } from '../middleware/screenPermissions.js';

test('role-only defaults preserve supported screens and deny unsupported grants', () => {
  const grants = defaultPermissions();
  assert.equal(can(grants, 'warden', 'attendance', 'edit'), true);
  assert.equal(can(grants, 'student', 'attendance', 'edit'), false);
  assert.equal(can(grants, 'lapc', 'my-leaves', 'create'), true);
  assert.deepEqual(validatePermissions(grants), grants);
  assert.equal(Object.hasOwn(ROLE_LABELS, 'lapc'), false);
  assert.equal(Object.hasOwn(grants, 'lapc'), false);
  grants.student.attendance = ['view'];
  assert.throws(() => validatePermissions(grants), /not supported/);
});
test('legacy LAPC accounts inherit Student restrictions instead of separate overrides', () => {
  const grants = defaultPermissions();
  grants.student['my-leaves'] = [];
  grants.lapc = { 'my-leaves': ['view', 'create'] };
  assert.equal(can(grants, 'LAPC', 'my-leaves', 'create'), false);
  assert.equal(canCallApi(grants, 'lapc', '/student/leave-requests', 'POST'), false);
  assert.equal(screenForView('my-leaves', 'lapc'), 'my-leaves');
  assert.throws(() => validatePermissions(grants), /Unknown role/);
});
test('admin cannot be locked out; unknown screens/actions/roles and missing view are rejected', () => {
  for (const mutate of [g => g.admin['screen-permissions'] = [], g => g.warden.attendance = ['edit'],
    g => g.warden.attendance = ['view', 'destroy'], g => g.invented = {}, g => g.warden.invented = []]) {
    const grants = defaultPermissions(); mutate(grants); assert.throws(() => validatePermissions(grants));
  }
  assert.deepEqual(normalizeActions(['edit', 'edit']), ['view', 'edit']);
});
test('view-only blocks every mutation including GET billing generation and POST correction', () => {
  const grants = defaultPermissions();
  for (const id of Object.keys(grants.mess)) if (grants.mess[id].length) grants.mess[id] = ['view'];
  for (const [method, path] of [['POST', '/mess/items'], ['PUT', '/mess/items/1'], ['DELETE', '/mess/items/1'],
    ['POST', '/mess/inventory/correct-last-purchase'], ['GET', '/mess/daily-charges/calculate'],
    ['POST', '/mess/generate-mess-bills'], ['GET', '/mess/stock/export-excel'],
    ['POST', '/menu-planning/plans'], ['PUT', '/menu-planning/settings']]) {
    assert.equal(canCallApi(grants, 'mess', path, method), false, `${method} ${path}`);
  }
  assert.equal(canCallApi(grants, 'mess', '/mess/stock', 'GET'), true);
  assert.equal(canCallApi(grants, 'mess', '/inventories/1/reports?format=preview', 'GET'), true);
  assert.equal(canCallApi(grants, 'mess', '/inventories/1/reports?format=xlsx', 'GET'), false);
});
test('custom actions distinguish add, edit, decision and delete without trusting the caller screen', () => {
  const grants = defaultPermissions();
  grants.mess.inventory = ['view', 'create'];
  assert.equal(canCallApi(grants, 'mess', '/mess/stock', 'POST'), true);
  assert.equal(canCallApi(grants, 'mess', '/mess/inventory/correct-last-purchase', 'POST'), false);
  grants.warden['leave-approvals'] = ['view'];
  assert.equal(canCallApi(grants, 'warden', '/warden/leave-requests/8/approve', 'PUT'), false);
  grants.student['my-leaves'] = [];
  assert.equal(canCallApi(grants, 'student', '/student/leave-requests', 'GET'), false);
  assert.equal(canCallApi(grants, 'student', '/student/leave-requests', 'POST'), false);
});
test('read dependencies support enabled forms but never grant mutation access', () => {
  const grants = defaultPermissions(); grants.warden.students = [];
  assert.equal(canCallApi(grants, 'warden', '/warden/students', 'GET'), true);
  assert.equal(canCallApi(grants, 'warden', '/warden/students', 'POST'), false);
  for (const id of Object.keys(grants.warden)) grants.warden[id] = [];
  assert.equal(canCallApi(grants, 'warden', '/warden/students', 'GET'), false);
});
test('shared web aliases use the same capability and changes contain before/after values', () => {
  assert.equal(screenForView('bed-fee-management', 'mess'), screenForView('mess-fee', 'mess'));
  assert.equal(screenForView('items', 'mess'), screenForView('inventory', 'mess'));
  assert.equal(screenForView('facilities', 'student'), 'my-facilities');
  assert.equal(screenForView('facilities', 'admin'), 'admin-facilities');
  const before = defaultPermissions(), after = structuredClone(before); after.warden.attendance = ['view'];
  assert.deepEqual(permissionChanges(before, after), [{ role: 'warden', screen: 'attendance', before: before.warden.attendance, after: ['view'] }]);
});
test('every existing feature route has an explicit valid permission mapping', () => {
  for (const area of ['warden', 'student', 'mess', 'menu-planning', 'inventories', 'attendance', 'outpass', 'parent']) {
    const filename = area === 'menu-planning' ? 'menuPlanning' : area === 'attendance' ? 'attendanceRoutes' : area;
    const source = fs.readFileSync(new URL(`../routes/${filename}.js`, import.meta.url), 'utf8');
    for (const match of source.matchAll(/router\.(get|post|put|delete|patch)\('([^']+)'/g)) {
      const rule = apiPermission(`/api/${area}${match[2]}`, match[1].toUpperCase(), area);
      assert.ok(rule?.any.length, `${area} ${match[1]} ${match[2]}`);
      for (const item of rule.any) assert.ok(screenById[item.screen]?.actions.includes(item.action), JSON.stringify(item));
    }
  }
  assert.equal(new Set(SCREENS.map(s => s.id)).size, SCREENS.length);
});
test('middleware revokes on the next request and fails closed when storage is unavailable', async () => {
  const grants = defaultPermissions(); let nextCalls = 0;
  const enforcer = createPermissionEnforcer(async () => ({ revision: 1, grants }));
  const req = { user: { role: 'warden' }, method: 'PUT', originalUrl: '/api/warden/leave-requests/1/approve', headers: { 'x-screen': 'dashboard' } };
  const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });
  await enforcer(req, response(), () => nextCalls++);
  grants.warden['leave-approvals'] = ['view']; const denied = response();
  await enforcer(req, denied, () => nextCalls++);
  assert.equal(nextCalls, 1); assert.equal(denied.statusCode, 403); assert.equal(denied.body.code, 'SCREEN_PERMISSION_DENIED');
  const unavailable = response(); await createPermissionEnforcer(async () => { throw new Error('offline'); })(req, unavailable, () => nextCalls++);
  assert.equal(unavailable.statusCode, 503); assert.equal(nextCalls, 1);
});
