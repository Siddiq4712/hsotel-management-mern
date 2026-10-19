import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { initAssociations, Hostel, HostelRoom, RoomType, Inventory, InventoryHostel } from '../models/index.js';
import { createHostel, getHostels, getHostelById, updateHostel, deleteHostel } from '../controllers/adminController.js';

initAssociations();
const originalTransaction = sequelize.transaction.bind(sequelize);
const originalQuery = sequelize.query.bind(sequelize);
const transaction = await originalTransaction();
const hooks = ['beforeFind', 'beforeCount', 'beforeCreate', 'beforeUpdate'];
for (const hook of hooks) sequelize.addHook(hook, 'hostelFixture', (...args) => { args.at(-1).transaction ||= transaction; });
sequelize.query = (sql, options = {}) => originalQuery(sql, { ...options, transaction: options.transaction || transaction });
sequelize.transaction = (options, callback) => typeof options === 'function'
  ? originalTransaction({ transaction }, options)
  : originalTransaction({ ...options, transaction: options?.transaction || transaction }, callback);
const tag = `Hostel CRUD ${crypto.randomUUID()}`;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const call = async (handler, { body = {}, id, query = {} } = {}) => {
  const res = response(); await handler({ body, params: { id }, query }, res); return res;
};
try {
  const created = await call(createHostel, { body: { name: `  ${tag} A  `, capacity: 20, email: '' } });
  assert.equal(created.statusCode, 201, created.body?.message);
  const first = created.body.data;
  assert.equal(first.name, `${tag} A`); assert.equal(first.email, null);
  assert.equal((await call(createHostel, { body: { name: first.name, capacity: 20 } })).statusCode, 409);
  for (const body of [{ name: ' ', capacity: 20 }, { name: tag, capacity: 1.5 }, { name: tag, capacity: 0 }, { name: tag, capacity: 20, email: 'invalid' }]) {
    assert.equal((await call(createHostel, { body })).statusCode, 400);
  }
  const second = (await call(createHostel, { body: { name: `${tag} B`, capacity: 10 } })).body.data;
  const roomType = await RoomType.create({ name: `Type ${tag}`, hostel_id: first.id, capacity: 2 }, { transaction });
  const room = await HostelRoom.create({ hostel_id: first.id, room_type_id: roomType.id, room_number: 'Fixture 1', occupancy_count: 2 }, { transaction });
  const details = await call(getHostelById, { id: first.id });
  assert.equal(details.statusCode, 200); assert.equal(details.body.data.HostelRooms.length, 1);
  const listed = await call(getHostels, { query: { search: tag } });
  assert.equal(listed.statusCode, 200, listed.body?.message); assert.equal(listed.body.data.length, 2);
  const changed = await call(updateHostel, { id: first.id, body: { name: `${tag} Updated`, address: 'New address', contact_number: '12345', email: 'fixture@example.invalid', capacity: 25 } });
  assert.equal(changed.statusCode, 200, changed.body?.message);
  assert.equal(changed.body.data.capacity, 25); assert.equal(changed.body.data.address, 'New address');
  assert.equal((await call(updateHostel, { id: first.id, body: { name: second.name } })).statusCode, 409);
  for (const capacity of [0, -1, 1.5, 1, 2147483648]) assert.equal((await call(updateHostel, { id: first.id, body: { capacity } })).statusCode, 400);
  assert.equal((await call(updateHostel, { id: first.id, body: { email: 'invalid' } })).statusCode, 400);
  assert.equal((await call(updateHostel, { id: first.id, body: { email: '' } })).statusCode, 200);
  assert.equal((await call(updateHostel, { id: first.id, body: { is_active: false } })).statusCode, 200);
  assert.equal((await call(getHostels, { query: { search: tag } })).body.data.length, 1);
  assert.equal((await call(getHostels, { query: { search: tag, include_inactive: 'true' } })).body.data.length, 2);
  assert.equal((await call(updateHostel, { id: first.id, body: { is_active: true } })).statusCode, 200);
  const removed = await call(deleteHostel, { id: first.id });
  assert.equal(removed.statusCode, 200, removed.body?.message); assert.equal(removed.body.deactivated, true);
  assert.equal((await Hostel.findByPk(first.id, { transaction })).is_active, false);
  assert(await HostelRoom.findByPk(room.id, { transaction }), 'linked rooms remain intact');
  const empty = await call(deleteHostel, { id: second.id });
  assert.equal(empty.statusCode, 200, empty.body?.message); assert.equal(empty.body.deactivated, false);
  assert.equal(await Hostel.findByPk(second.id, { transaction }), null);
  const third = (await call(createHostel, { body: { name: `${tag} Inventory`, capacity: 5 } })).body.data;
  const pool = await Inventory.create({ name: `${tag} Stock` }, { transaction });
  await InventoryHostel.create({ hostel_id: third.id, inventory_id: pool.id }, { transaction });
  const linked = await call(deleteHostel, { id: third.id });
  assert.equal(linked.statusCode, 200, linked.body?.message); assert.equal(linked.body.deactivated, true);
  assert(await InventoryHostel.findByPk(third.id, { transaction }), 'inventory assignment survives deactivation');
  for (const handler of [getHostelById, updateHostel, deleteHostel]) {
    assert.equal((await call(handler, { id: 2147483647, body: { name: tag } })).statusCode, 404);
    assert.equal((await call(handler, { id: 'invalid', body: { name: tag } })).statusCode, 400);
  }
  console.log('PASS: create, duplicate and input validation, MySQL search, list, details and room counts, edit, capacity and email validation, inactive filter, reactivation, empty deletion, and preservation of linked rooms and inventory.');
} finally {
  sequelize.transaction = originalTransaction; sequelize.query = originalQuery;
  for (const hook of hooks) sequelize.removeHook(hook, 'hostelFixture');
  await transaction.rollback();
  assert.equal(await Hostel.count({ where: { name: { [Op.like]: `${tag}%` } } }), 0);
  await sequelize.close();
  console.log('All hostel CRUD integration fixtures rolled back.');
}
