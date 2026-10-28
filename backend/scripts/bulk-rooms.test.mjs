import test from 'node:test';
import assert from 'node:assert/strict';
import { deleteSelectedRooms, generateRoomNumbers, prepareBulkRooms, resolveRoomHostel, saveBulkRooms } from '../services/bulkRooms.js';

const body = { prefix: 'S', start_number: 1, end_number: 3, number_width: 0, floor: 1, room_type_id: 4 };
function fixtures({ invalidType = false, failSave = false, deleted = [], occupants = 0 } = {}) {
  const writes = [];
  const queries = [];
  let committed = false;
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  const models = {
    Hostel: { findByPk: async (id, options) => { queries.push({ id, ...options }); return id === 2 ? { name: 'Hostel II' } : null; } },
    RoomType: { findOne: async ({ where }) => !invalidType && where.id === 4 && where.hostel_id === 2 ? { name: 'Double', capacity: 2 } : null },
    HostelRoom: {
      findAll: async ({ where }) => {
        assert.equal(where.hostel_id, 2);
        assert.equal(typeof where.is_active, 'boolean');
        return where.is_active ? [{ room_number: 's2' }] : deleted.map(room => ({
          ...room, update: async (data, options) => {
            assert.equal(options.transaction, transaction);
            writes.push({ id: room.id, ...data });
          }
        }));
      },
      bulkCreate: async (records, options) => { assert.equal(options.transaction, transaction); if (failSave) throw new Error('Save failed'); writes.push(...records); }
    },
    RoomAllotment: { count: async () => occupants },
    sequelize: { transaction: async fn => { const result = await fn(transaction); committed = true; return result; } }
  };
  return { models, writes, queries, committed: () => committed };
}
test('generates inclusive numbers, preserves prefix case and supports zero padding', () => {
  assert.deepEqual(generateRoomNumbers(body), ['S1', 'S2', 'S3']);
  assert.deepEqual(generateRoomNumbers({ ...body, prefix: 's', number_width: 3 }), ['s001', 's002', 's003']);
  assert.deepEqual(generateRoomNumbers({ ...body, prefix: '' }), ['1', '2', '3']);
  assert.deepEqual(generateRoomNumbers({ ...body, prefix: 'A-', start_number: 0, end_number: 0 }), ['A-0']);
  assert.equal(generateRoomNumbers({ ...body, end_number: 500 }).length, 500);
});
test('rejects invalid ranges, missing numbers, excessive batches and invalid widths', () => {
  for (const changes of [{ start_number: 4 }, { start_number: -1 }, { start_number: 1.2 }, { start_number: null },
    { start_number: true }, { end_number: '' }, { end_number: 501 }, { number_width: 11 }, { prefix: 'x'.repeat(65) }, { prefix: '\n' }]) {
    assert.throws(() => generateRoomNumbers({ ...body, ...changes }));
  }
});
test('warden hostel is taken only from assignment, ignoring submitted hostel', () => {
  assert.equal(resolveRoomHostel({ hostel_id: 999 }, { hostel_id: 2 }, false), 2);
  assert.equal(resolveRoomHostel({}, { hostelId: 2 }, false), 2);
  assert.throws(() => resolveRoomHostel({ hostel_id: 2 }, {}, false), /No hostel/);
});
test('admin must explicitly select a hostel', () => {
  assert.equal(resolveRoomHostel({ hostel_id: 2 }, {}, true), 2);
  assert.throws(() => resolveRoomHostel({}, { hostel_id: 2 }, true), /Select a valid hostel/);
});
test('preview marks duplicates in the same hostel without writing', async () => {
  const f = fixtures();
  const preview = await prepareBulkRooms(body, 2, f.models);
  assert.equal(preview.to_create, 2);
  assert.equal(preview.skipped, 1);
  assert.deepEqual(preview.rooms.map(room => room.exists), [false, true, false]);
  assert.deepEqual(f.writes, []);
});
test('room type must belong to the chosen hostel and floor must be valid', async () => {
  await assert.rejects(prepareBulkRooms(body, 2, fixtures({ invalidType: true }).models), /does not belong/);
  await assert.rejects(prepareBulkRooms(body, 3, fixtures().models), /does not exist/);
  for (const floor of [null, '', -1, 1.5, true]) await assert.rejects(prepareBulkRooms({ ...body, floor }, 2, fixtures().models), /Floor/);
});
test('save rechecks duplicates under a hostel lock and creates only missing rooms', async () => {
  const f = fixtures();
  const result = await saveBulkRooms(body, 2, f.models);
  assert.equal(result.created, 2);
  assert.equal(f.queries[0].lock, 'UPDATE');
  assert.deepEqual(f.writes.map(room => room.room_number), ['S1', 'S3']);
  assert.ok(f.writes.every(room => room.hostel_id === 2 && room.floor === 1 && room.occupancy_count === 0));
  assert.equal(f.committed(), true);
});
test('all-existing range creates nothing', async () => {
  const f = fixtures();
  const result = await saveBulkRooms({ ...body, start_number: 2, end_number: 2 }, 2, f.models);
  assert.equal(result.created, 0);
  assert.equal(result.skipped, 1);
  assert.deepEqual(f.writes, []);
});

test('deleted room numbers are available and restore their original IDs with new settings', async () => {
  const f = fixtures({ deleted: [{ id: 17, room_number: ' s1 ', occupancy_count: 0, is_occupied: false }] });
  const preview = await prepareBulkRooms(body, 2, f.models);
  assert.deepEqual(preview.rooms.map(room => room.exists), [false, true, false]);
  assert.deepEqual(f.writes, []);
  const result = await saveBulkRooms(body, 2, f.models);
  assert.equal(result.created, 2);
  assert.equal(result.skipped, 1);
  assert.deepEqual(f.writes, [
    { id: 17, hostel_id: 2, room_type_id: 4, floor: 1, room_number: 'S1',
      is_active: true, occupancy_count: 0, is_occupied: false, layout_slot: null },
    { hostel_id: 2, room_type_id: 4, floor: 1, room_number: 'S3',
      is_active: true, occupancy_count: 0, is_occupied: false }
  ]);
  assert.equal(f.committed(), true);
});

test('recreating a deleted room never clears unresolved occupants', async () => {
  for (const options of [{ occupants: 1 }, { occupancy_count: 1 }, { is_occupied: true }]) {
    const f = fixtures({ occupants: options.occupants, deleted: [{ id: 17, room_number: 'S1', ...options }] });
    await assert.rejects(saveBulkRooms(body, 2, f.models), /still has occupants/);
    assert.deepEqual(f.writes, []);
    assert.equal(f.committed(), false);
  }
});
test('failed save does not commit', async () => {
  const f = fixtures({ failSave: true });
  await assert.rejects(saveBulkRooms(body, 2, f.models), /Save failed/);
  assert.equal(f.committed(), false);
});

function deletionFixtures({ missing = false, occupied = false, cached = 0, flagged = false } = {}) {
  const writes = [];
  const models = {
    Hostel: { findByPk: async id => { assert.equal(id, 2); return { id }; } },
    HostelRoom: { findOne: async ({ where, lock }) => {
      assert.equal(where.hostel_id, 2); assert.equal(where.is_active, true); assert.equal(lock, 'UPDATE');
      if (missing && where.id === 2) return null;
      return { id: where.id, room_number: `S${where.id}`, occupancy_count: cached, is_occupied: flagged,
        update: async data => writes.push({ id: where.id, ...data }) };
    } },
    RoomAllotment: { count: async ({ where }) => occupied && where.room_id === 2 ? 1 : 0 },
    sequelize: { transaction: async fn => fn({ LOCK: { UPDATE: 'UPDATE' } }) }
  };
  return { models, writes };
}
test('deletes only selected empty rooms and de-duplicates identifiers', async () => {
  const f = deletionFixtures();
  assert.deepEqual(await deleteSelectedRooms({ room_ids: [2, 1, 1] }, 2, f.models), { deleted: 2 });
  assert.deepEqual(f.writes, [{ id: 1, is_active: false }, { id: 2, is_active: false }]);
});
test('occupied, foreign and removed rooms prevent deletion of the entire selection', async () => {
  for (const options of [{ occupied: true }, { cached: 1 }, { flagged: true }, { missing: true }]) {
    const f = deletionFixtures(options);
    await assert.rejects(deleteSelectedRooms({ room_ids: [1, 2] }, 2, f.models));
    assert.deepEqual(f.writes, []);
  }
});
test('empty, invalid and excessive deletion selections fail', async () => {
  for (const ids of [[], [0], [true], ['invalid'], Array.from({ length: 501 }, (_, i) => i + 1)]) {
    await assert.rejects(deleteSelectedRooms({ room_ids: ids }, 2, deletionFixtures().models), /Select between/);
  }
});
