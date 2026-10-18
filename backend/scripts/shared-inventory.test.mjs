import test from 'node:test';
import assert from 'node:assert/strict';
import { Op } from 'sequelize';
import { installAdminWorkspace } from '../middleware/adminWorkspace.js';
import { Hostel, Inventory, InventoryHostel } from '../models/index.js';
import { inventoryScope } from '../services/inventoryScope.js';

test('inventory scope and Admin routing enforce assigned pools and preserve consuming hostel', async () => {
  const saved = [Hostel.findAll, Hostel.findByPk, Inventory.findByPk, InventoryHostel.findAll, InventoryHostel.findByPk];
  const hostels = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
  const assignments = [{ hostel_id: 1, inventory_id: 10 }, { hostel_id: 2, inventory_id: 10 }, { hostel_id: 3, inventory_id: 20 }];
  Hostel.findAll = async options => options?.where?.id ? hostels.filter(hostel => options.where.id[Op.in].includes(hostel.id)) : hostels;
  Hostel.findByPk = async id => hostels.find(row => row.id === Number(id));
  Inventory.findByPk = async id => [10,20].includes(Number(id)) ? { id: Number(id), name: `Pool ${id}` } : null;
  InventoryHostel.findAll = async options => options?.where ? assignments.filter(row => row.inventory_id === options.where.inventory_id) : assignments;
  InventoryHostel.findByPk = async id => assignments.find(row => row.hostel_id === Number(id));
  try {
    assert.deepEqual(await inventoryScope(1), { inventory_id: 10 });
    assert.deepEqual(await inventoryScope(2), { inventory_id: 10 });
    assert.deepEqual(await inventoryScope(3), { inventory_id: 20 });
    await assert.rejects(() => inventoryScope(4), /no inventory/);
    const routes = {};
    const router = Object.fromEntries(['get','post','put','patch','delete'].map(method => [method, (path,...handlers) => { routes[`${method} ${path}`] = handlers.at(-1); }]));
    installAdminWorkspace(router, 'mess');
    let actor;
    router.post('/consumption/single-page', async (req,res) => { actor = req.user; res.json({ success: true }); });
    router.get('/stock', async (req,res) => res.json({ success: true, data: [{ id: req.user.hostel_id }] }));
    const request = (extra = {}) => ({ user: { role: 'admin', hostel_id: null }, query: {}, body: {}, params: {}, get: key => key === 'X-Inventory-Id' ? '10' : undefined, ...extra });
    const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
    const required = response(); await routes['post /consumption/single-page'](request(), required);
    assert.equal(required.statusCode, 409); assert.equal(required.body.code, 'HOSTEL_REQUIRED');
    assert.deepEqual(required.body.hostels.map(row => row.id), [1,2]);
    await routes['post /consumption/single-page'](request({ body: { hostel_id: 2 } }), response());
    assert.equal(actor.hostel_id, 2);
    const forbidden = response(); await routes['post /consumption/single-page'](request({ body: { hostel_id: 3 } }), forbidden);
    assert.equal(forbidden.statusCode, 400); assert.equal(actor.hostel_id, 2);
    const all = response(); await routes['get /stock'](request({ get: () => undefined }), all);
    assert.deepEqual(all.body.data.map(row => row.id), [1,3], 'shared inventory appears once in all-inventory totals');
    await routes['post /consumption/single-page'](request({ user: { role: 'mess', hostel_id: 3 }, body: { hostel_id: 1 } }), response());
    assert.equal(actor.hostel_id, 3, 'staff cannot override assigned hostel or inventory');
  } finally { [Hostel.findAll, Hostel.findByPk, Inventory.findByPk, InventoryHostel.findAll, InventoryHostel.findByPk] = saved; }
});
