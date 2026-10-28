import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { Hostel, RoomType, HostelRoom, RoomAllotment, sequelize } from '../models/index.js';
import { updateRoomTypeWarden } from '../controllers/wardenController.js';

const originals = [Hostel.findByPk, RoomType.findOne, HostelRoom.findAll, RoomAllotment.count, sequelize.transaction];
after(() => { [Hostel.findByPk, RoomType.findOne, HostelRoom.findAll, RoomAllotment.count, sequelize.transaction] = originals; });
const response = () => ({ code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } });
const request = body => ({ user: { hostel_id: 2 }, params: { id: '4' }, body: { name: ' Double Room ', capacity: 2, description: 'Updated', ...body } });
function fixtures({ missing = false, duplicate = false, occupants = 1, cached = 1 } = {}) {
  const writes = [];
  const transaction = { LOCK: { UPDATE: 'UPDATE' } };
  Hostel.findByPk = async id => { assert.equal(id, 2); return { id }; };
  RoomType.findOne = async ({ where }) => {
    assert.equal(where.hostel_id, 2);
    if (where.name) return duplicate ? { id: 9 } : null;
    return missing ? null : { id: 4, update: async (data, options) => { assert.equal(options.transaction, transaction); writes.push(data); } };
  };
  HostelRoom.findAll = async ({ where, lock }) => { assert.equal(where.hostel_id, 2); assert.equal(lock, 'UPDATE'); return [{ id: 5, room_number: 'S1', occupancy_count: cached }]; };
  RoomAllotment.count = async () => occupants;
  sequelize.transaction = async callback => callback(transaction);
  return writes;
}
test('edits only the assigned-hostel template and trims the name', async () => {
  const writes = fixtures();
  const res = response();
  await updateRoomTypeWarden(request({ hostel_id: 999 }), res);
  assert.equal(res.code, 200);
  assert.deepEqual(writes, [{ name: 'Double Room', capacity: 2, description: 'Updated' }]);
});
test('rejects invalid names and capacities before updating', async () => {
  for (const values of [{ name: ' ' }, { capacity: 0 }, { capacity: -1 }, { capacity: 1.5 }, { capacity: true }]) {
    const writes = fixtures(); const res = response();
    await updateRoomTypeWarden(request(values), res);
    assert.equal(res.code, 400);
    assert.equal(writes.length, 0);
  }
});
test('rejects another template with the same name', async () => {
  const writes = fixtures({ duplicate: true }); const res = response();
  await updateRoomTypeWarden(request(), res);
  assert.equal(res.code, 400);
  assert.match(res.body.message, /already exists/);
  assert.equal(writes.length, 0);
});
test('rejects capacity below actual or cached occupied beds', async () => {
  for (const state of [{ occupants: 3 }, { cached: 3 }]) {
    const writes = fixtures(state); const res = response();
    await updateRoomTypeWarden(request(), res);
    assert.equal(res.code, 400);
    assert.match(res.body.message, /room S1/);
    assert.equal(writes.length, 0);
  }
});
test('missing and foreign templates are not updated', async () => {
  const writes = fixtures({ missing: true }); const res = response();
  await updateRoomTypeWarden(request(), res);
  assert.equal(res.code, 404);
  assert.equal(writes.length, 0);
});
