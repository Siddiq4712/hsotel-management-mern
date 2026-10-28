import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../controllers/messController.js', import.meta.url), 'utf8');
const section = source.slice(source.indexOf('export const bulkDeleteStudentFees ='));
const handler = section.slice(0, section.indexOf('\n};') + 3).replace('export const', 'const');

test('fee deletion releases transactions and avoids acquiring them for invalid input', async () => {
  let opened = 0, committed = 0, rolledBack = 0, failQuery = false, failAcquire = false;
  const context = {
    sequelize: { transaction: async () => { if (failAcquire) throw new Error('Pool unavailable'); opened++; return { commit: async () => committed++, rollback: async () => rolledBack++ }; } },
    StudentFee: { findAll: async () => { if (failQuery) throw new Error('Query failed'); return []; }, destroy: async () => 1 },
    Op: { in: Symbol('in') }, console: { error() {} },
  };
  vm.createContext(context);
  vm.runInContext(`${handler};this.handler=bulkDeleteStudentFees`, context);
  const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
  for (let i = 0; i < 10; i++) await context.handler({ body: {}, user: { hostel_id: 1 } }, res);
  assert.equal(res.code, 400);
  assert.equal(opened, 0);
  await context.handler({ body: { ids: [1] }, user: { hostel_id: 1 } }, res);
  assert.equal(committed, 1);
  failQuery = true;
  await context.handler({ body: { ids: [1] }, user: { hostel_id: 1 } }, res);
  assert.equal(rolledBack, 1);
  assert.equal(opened, committed + rolledBack);
  failAcquire = true;
  await context.handler({ body: { ids: [1] }, user: { hostel_id: 1 } }, res);
  assert.equal(res.code, 500);
  assert.equal(rolledBack, 1);
});
