import test from 'node:test';
import assert from 'node:assert/strict';
import { installAdminWorkspace } from '../middleware/adminWorkspace.js';
import { Hostel, User } from '../models/index.js';

test('visible hostel scope filters lists, supplies new entries, and never replaces existing record ownership', async t => {
  const hostels = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
  t.mock.method(Hostel, 'findAll', async () => hostels);
  t.mock.method(Hostel, 'findByPk', async id => hostels.find(hostel => hostel.id === id));
  t.mock.method(User, 'findByPk', async () => ({ get: key => key === 'hostel_id' ? 2 : null }));
  const routes = {};
  const router = Object.fromEntries(['get', 'post', 'put', 'patch', 'delete'].map(method => [method, (path, ...handlers) => { routes[`${method} ${path}`] = handlers.at(-1); }]));
  installAdminWorkspace(router, 'warden');
  const handler = (req, res) => res.json({ success: true, data: [{ hostel: req.user.hostel_id }] });
  router.get('/students', handler); router.post('/holidays', handler); router.put('/students/:id', handler);
  router.post('/students', handler);
  const req = extra => ({ user: { role: 'admin' }, query: {}, body: {}, params: {},
    get: key => key === 'X-Workspace-Hostel-Id' ? '1' : undefined, ...extra });
  const response = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } });
  const selected = response(); await routes['get /students'](req(), selected);
  assert.deepEqual(selected.body.data, [{ hostel: 1 }]);
  const entry = response(); await routes['post /holidays'](req(), entry);
  assert.equal(entry.body.data[0].hostel, 1);
  const record = response(); await routes['put /students/:id'](req({ params: { id: 50 } }), record);
  assert.equal(record.body.data[0].hostel, 2, 'student ownership takes priority over the list scope');
  const staff = response(); await routes['get /students'](req({ user: { role: 'warden', hostel_id: 2 } }), staff);
  assert.equal(staff.body.data[0].hostel, 2, 'staff cannot override their assigned hostel');
  const enrollment = response(); await routes['post /students'](req(), enrollment);
  assert.equal(enrollment.body.data[0].hostel, undefined, 'batch-routed enrollment must not inherit the browsing hostel');
  const invalid = response(); await routes['get /students'](req({ get: key => key === 'X-Workspace-Hostel-Id' ? 'bad' : undefined }), invalid);
  assert.equal(invalid.statusCode, 400);
});
