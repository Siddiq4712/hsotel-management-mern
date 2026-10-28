import test from 'node:test';
import assert from 'node:assert/strict';
import { archiveRoomTemplate } from '../services/roomTemplates.js';
import { ensureRoomTemplateSchema } from '../services/roomTemplateSchema.js';

function fixtures({ activeRooms = 0, missing = false } = {}) {
  const updates = [];
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const models = {
    sequelize: { transaction: async fn => fn(transaction) },
    Hostel: { findByPk: async (id, options) => { assert.equal(id, 2); assert.equal(options.lock, 'UPDATE'); return { id }; } },
    RoomType: { findOne: async ({ where }) => {
      assert.deepEqual(where, { id: 4, hostel_id: 2, is_active: true });
      return missing ? null : { update: async (values, options) => { assert.equal(options.transaction, transaction); updates.push(values); }, destroy: () => assert.fail('Historical template must not be physically deleted') };
    } },
    HostelRoom: { count: async ({ where }) => {
      assert.deepEqual(where, { room_type_id: 4, is_active: true });
      return activeRooms;
    } }
  };
  return { models, updates };
}
test('archives a template even when inactive rooms still reference it', async () => {
  const f = fixtures();
  await archiveRoomTemplate(4, 2, f.models);
  assert.deepEqual(f.updates, [{ is_active: false }]);
});
test('active rooms still block template deletion', async () => {
  const f = fixtures({ activeRooms: 1 });
  await assert.rejects(archiveRoomTemplate(4, 2, f.models), error => error.status === 400);
  assert.deepEqual(f.updates, []);
});
test('missing, archived and other-hostel templates are not changed', async () => {
  const f = fixtures({ missing: true });
  await assert.rejects(archiveRoomTemplate(4, 2, f.models), error => error.status === 404);
  assert.deepEqual(f.updates, []);
});
test('schema adds the active flag once without rewriting existing templates', async () => {
  let added = false;
  const changes = [];
  const database = { getQueryInterface: () => ({
    describeTable: async () => added ? { is_active: {} } : {},
    addColumn: async (table, column, definition) => { added = true; changes.push({ table, column, defaultValue: definition.defaultValue }); }
  }) };
  await ensureRoomTemplateSchema(database);
  await ensureRoomTemplateSchema(database);
  assert.deepEqual(changes, [{ table: 'tbl_RoomType', column: 'is_active', defaultValue: true }]);
});
