// Read-only smoke checks against the running local API; no accounts or policies are changed.
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { validatePermissions } from '../../shared/permissions.js';
import { Role, User } from '../models/index.js';

const base = 'http://127.0.0.1:5001/api';
async function tokenFor(name) {
  const role = await Role.findOne({ where: { roleName: { [Op.in]: [name, name.toLowerCase()] } } });
  const user = role && await User.findOne({ where: { roleId: role.roleId, status: true } });
  assert.ok(user, `An active ${name} account is required for this read-only check.`);
  return jwt.sign({ userId: user.userId, role: name.toLowerCase() }, process.env.JWT_SECRET, { expiresIn: '2m' });
}
async function get(path, token) {
  const response = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status, body: await response.json() };
}
try {
  const admin = await tokenFor('Admin');
  const policy = await get('/permissions', admin);
  assert.equal(policy.status, 200);
  assert.ok(policy.body.data.screens.length > 40);
  validatePermissions(policy.body.data.grants);
  assert.ok(Number.isInteger(policy.body.data.revision));
  assert.equal((await get('/permissions/history', admin)).status, 200);
  const warden = await tokenFor('Warden');
  assert.equal((await get('/permissions', warden)).status, 403);
  const mine = await get('/permissions/mine', warden);
  assert.equal(mine.status, 200);
  assert.deepEqual(Object.keys(mine.body.data.grants), ['warden']);
  assert.equal((await get('/student/profile', warden)).status, 403);
  console.log(`PASS: live admin matrix (${policy.body.data.screens.length} screen groups), history, role-isolated bootstrap, and non-admin settings denial.`);
} finally { await sequelize.close(); }
