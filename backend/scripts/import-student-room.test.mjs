import test from 'node:test';
import assert from 'node:assert/strict';
import { importStudentRoom } from '../services/importStudentRoom.js';

function setup({ existing = null, capacity = 2, occupants = 0, missing = false } = {}) {
  const writes = [];
  const room = { id: 9, occupancy_count: occupants, RoomType: { capacity }, update: async data => writes.push(data) };
  const input = {
    studentId: 1, hostelId: 2, roomNumber: '01', transaction: { LOCK: { UPDATE: 'UPDATE' } }, RoomType: {},
    HostelRoom: { findOne: async query => {
      assert.deepEqual(query.where, { hostel_id: 2, room_number: '01', is_active: true });
      assert.equal(query.lock, 'UPDATE');
      return missing ? null : room;
    } },
    RoomAllotment: { findOne: async () => existing, count: async () => occupants, create: async data => writes.push(data) }
  };
  return { input, writes };
}

test('blank room skips allocation', async () => {
  await importStudentRoom({ roomNumber: '' });
});
test('existing room receives one allotment and occupancy update', async () => {
  const { input, writes } = setup();
  await importStudentRoom(input);
  assert.deepEqual(writes, [{ student_id: 1, room_id: 9, is_active: true }, { occupancy_count: 1 }]);
});
test('reimporting the same room is idempotent', async () => {
  const { input, writes } = setup({ existing: { room_id: 9 }, occupants: 2 });
  await importStudentRoom(input);
  assert.deepEqual(writes, []);
});
test('missing rooms, full rooms and conflicting allotments fail without writes', async () => {
  for (const [options, message] of [
    [{ missing: true }, /not an active room/],
    [{ occupants: 2 }, /no available capacity/],
    [{ existing: { room_id: 10 } }, /different active room/]
  ]) {
    const { input, writes } = setup(options);
    await assert.rejects(importStudentRoom(input), message);
    assert.deepEqual(writes, []);
  }
});
