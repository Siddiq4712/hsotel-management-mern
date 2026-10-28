// Uses isolated temporary tables in the configured database; never changes the live policy.
import assert from 'node:assert/strict';
import sequelize from '../config/database.js';
import { PermissionPolicy, PermissionHistory } from '../models/permissions.js';
import { ensurePermissionPolicy, readPermissionPolicy, savePermissionPolicy } from '../services/permissions.js';
const suffix = `${process.pid}_${Date.now()}`;
PermissionPolicy.tableName = `test_permission_policy_${suffix}`;
PermissionHistory.tableName = `test_permission_history_${suffix}`;
try {
  await PermissionPolicy.sync(); await PermissionHistory.sync(); await ensurePermissionPolicy();
  const initialRow = await PermissionPolicy.findByPk(1);
  const legacy = structuredClone(initialRow.grants);
  legacy.warden.attendance.push('retired-action');
  legacy.student['my-reductions'] = ['view', 'approve'];
  legacy.student['my-leaves'] = [];
  legacy.lapc = { 'my-leaves': ['view', 'create'] };
  await initialRow.update({ grants: legacy });
  const original = await readPermissionPolicy();
  assert.equal(original.grants.warden.attendance.includes('retired-action'), false);
  assert.deepEqual(original.grants.student['my-reductions'], ['view', 'delete']);
  assert.equal(Object.hasOwn(original.grants, 'lapc'), false);
  assert.deepEqual(original.grants.student['my-leaves'], []);
  const grants = structuredClone(original.grants); grants.warden.attendance = ['view'];
  const input = { revision: original.revision, grants, reason: 'Isolated integration check' };
  const actor = { userId: 1, userName: 'Permission integration test' };
  const results = await Promise.allSettled([savePermissionPolicy(input, actor), savePermissionPolicy(input, actor)]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(results.find(r => r.status === 'rejected').reason.status, 409);
  const saved = await readPermissionPolicy(); assert.equal(saved.revision, 1);
  assert.deepEqual(saved.grants.warden.attendance, ['view']);
  assert.equal(Object.hasOwn((await PermissionPolicy.findByPk(1)).grants, 'lapc'), false);
  assert.equal(await PermissionHistory.count(), 1);
  const change = await PermissionHistory.findOne();
  assert.deepEqual(change.changes[0].after, ['view']); assert.equal(change.actor_name, actor.userName);
  // A history failure must leave both policy and revision unchanged.
  const create = PermissionHistory.create;
  PermissionHistory.create = async () => { throw new Error('Simulated audit failure'); };
  try {
    const next = structuredClone(saved.grants); next.warden.attendance = [];
    await assert.rejects(savePermissionPolicy({ revision: 1, grants: next, reason: 'Rollback check' }, actor), /audit failure/);
    assert.equal((await readPermissionPolicy()).revision, 1);
    assert.deepEqual((await readPermissionPolicy()).grants.warden.attendance, ['view']);
  } finally { PermissionHistory.create = create; }
  console.log('PASS: MySQL persistence, concurrent-save conflict, before/after audit, and transaction rollback.');
} finally {
  // Only these two process-specific test tables may be dropped.
  for (const model of [PermissionHistory, PermissionPolicy]) {
    if (!String(model.getTableName()).endsWith(suffix)) throw new Error('Unexpected test table name.');
    await model.drop();
  }
  await sequelize.close();
}
