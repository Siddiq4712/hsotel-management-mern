// Integration fixtures and all stock movements are rolled back.
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { initAssociations, Hostel, Role, User, ItemCategory, Item, ItemStock, InventoryBatch, InventoryTransaction, UOM, Store, DailyConsumption, RestockPlan, MessDailyExpense } from '../models/index.js';
import { Inventory, InventoryHostel } from '../models/inventory.js';
import { inventoryScope } from '../services/inventoryScope.js';
import { recordInventoryPurchase, _recordBulkConsumptionLogic, getItemStock, recordItemReturn, correctLastPurchase } from '../controllers/messController.js';
import { saveInventory, listInventories } from '../controllers/inventoryController.js';
import { receivePurchaseOrder, listReceivedPurchaseOrders } from '../controllers/receivedPurchaseOrderController.js';
import { getMonthlyExpensesChartData } from '../controllers/messController.js';

initAssociations();
const originalTransaction = sequelize.transaction.bind(sequelize);
const originalQuery = sequelize.query.bind(sequelize);
const transaction = await originalTransaction();
sequelize.addHook('beforeFind', 'inventoryFixture', options => { options.transaction ||= transaction; });
sequelize.addHook('beforeCount', 'inventoryFixture', options => { options.transaction ||= transaction; });
sequelize.query = (sql, options = {}) => originalQuery(sql, { ...options, transaction: options.transaction || transaction });
sequelize.transaction = (options, callback) => typeof options === 'function'
  ? originalTransaction({ transaction }, async inner => {
    const name = inner.name;
    try { return await options(inner); } finally { inner.name = name; }
  })
  : originalTransaction({ ...options, transaction: options?.transaction || transaction }, callback);
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const tag = crypto.randomUUID();
try {
  const hostels = [];
  for (const suffix of ['A', 'B', 'C']) hostels.push(await Hostel.create({ name: `Inventory fixture ${tag} ${suffix}`, capacity: 10 }, { transaction }));
  const pool = await Inventory.create({ name: `Shared ${tag}` }, { transaction });
  const isolated = await Inventory.create({ name: `Isolated ${tag}` }, { transaction });
  await InventoryHostel.bulkCreate(hostels.map((hostel, index) => ({ hostel_id: hostel.id, inventory_id: index < 2 ? pool.id : isolated.id })), { transaction });
  const role = await Role.create({ roleName: `Inventory fixture ${tag}` }, { transaction });
  const actor = await User.create({ userName: 'Inventory fixture', userMail: `${tag}@invalid.test`, password: 'test-only', roleId: role.roleId }, { transaction });
  const unit = await UOM.create({ name: `Inventory kg ${tag}`, abbreviation: 'kg', type: 'weight' }, { transaction });
  const category = await ItemCategory.create({ name: `Inventory category ${tag}` }, { transaction });
  const item = await Item.create({ name: `Inventory rice ${tag}`, category_id: category.id, unit_id: unit.id }, { transaction });
  const store = await Store.create({ name: `Inventory store ${tag}` }, { transaction });
  const request = (hostel, body = {}) => ({ user: { userId: actor.userId, role: 'admin', hostel_id: hostel.id }, body, query: {}, params: {} });
  const purchase = async (hostel, quantity, price) => {
    const res = response();
    await recordInventoryPurchase(request(hostel, { items: [{ item_id: item.id, store_id: store.id, quantity, unit_price: price }] }), res);
    assert.equal(res.statusCode, 201, res.body?.message);
  };
  await purchase(hostels[0], 100, 4);
  await purchase(hostels[1], 20, 7);
  await purchase(hostels[2], 10, 9);
  // Receiving an order changes assets and rates, while only consumption contributes food expenses.
  const receiptItem = await Item.create({ name: `Receipt rice ${tag}`, category_id: category.id, unit_id: unit.id }, { transaction });
  const receiptBody = reference => ({ order_reference: reference, store_id: store.id,
    items: [{ item_id: receiptItem.id, quantity: 10, unit_price: 40 }] });
  const beforeDailyExpenses = await MessDailyExpense.count({ where: { hostel_id: hostels[0].id }, transaction });
  const firstReceipt = response();
  await receivePurchaseOrder(request(hostels[0], receiptBody('PO-001')), firstReceipt);
  assert.equal(firstReceipt.statusCode, 201, firstReceipt.body?.message);
  const secondBody = receiptBody('PO-002'); secondBody.items[0].unit_price = 60;
  const secondReceipt = response();
  await receivePurchaseOrder(request(hostels[1], secondBody), secondReceipt);
  assert.equal(secondReceipt.statusCode, 201, secondReceipt.body?.message);
  const duplicateReceipt = response();
  await receivePurchaseOrder(request(hostels[1], receiptBody('po-001')), duplicateReceipt);
  assert.equal(duplicateReceipt.statusCode, 409, 'duplicate reference cannot add shared stock twice');
  const receivedStock = response(); await getItemStock(request(hostels[0]), receivedStock);
  const receivedRow = receivedStock.body.data.find(row => row.item_id === receiptItem.id);
  assert.equal(receivedRow.current_stock, 20);
  assert.equal(receivedRow.effective_unit_price, 50, 'stock shows weighted unit rate, not oldest batch price');
  assert.equal(await DailyConsumption.count({ where: { item_id: receiptItem.id }, transaction }), 0, 'receipt creates no consumption expense');
  const chart = async () => {
    const req = request(hostels[0]); req.query = { month: 10, year: 2026 };
    const res = response(); await getMonthlyExpensesChartData(req, res);
    assert.equal(res.statusCode, 200, res.body?.message);
    return res.body.data.datasets[0].data.reduce((sum, value) => sum + Number(value), 0);
  };
  assert.equal(await chart(), 0, 'purchases do not count towards monthly expenses');
  await _recordBulkConsumptionLogic([{ item_id: receiptItem.id, quantity_consumed: 2, meal_type: 'lunch', consumption_date: '2026-10-18' }], hostels[0].id, actor.userId, transaction);
  assert.equal(await chart(), 100, 'only consumed quantity enters food expenses');
  assert.equal(await MessDailyExpense.count({ where: { hostel_id: hostels[0].id }, transaction }), beforeDailyExpenses, 'no duplicate manual expense is inserted');
  const receiptHistory = response(); await listReceivedPurchaseOrders(request(hostels[1]), receiptHistory);
  assert.equal(receiptHistory.statusCode, 200, receiptHistory.body?.message);
  assert.equal(receiptHistory.body.data.length, 2);
  assert.equal(receiptHistory.body.data.find(order => order.order_reference === 'PO-002').total_amount, 600);
  const stockBeforeInvalid = Number((await ItemStock.findOne({ where: { inventory_id: pool.id, item_id: receiptItem.id }, transaction })).current_stock);
  const invalidBody = receiptBody('PO-INVALID'); invalidBody.items.push({ item_id: 2147483647, quantity: 1, unit_price: 10 });
  const invalidReceipt = response(); await receivePurchaseOrder(request(hostels[0], invalidBody), invalidReceipt);
  assert.equal(invalidReceipt.statusCode, 500);
  assert.equal(Number((await ItemStock.findOne({ where: { inventory_id: pool.id, item_id: receiptItem.id }, transaction })).current_stock), stockBeforeInvalid, 'an invalid line rolls back the whole order');
  assert.equal(await InventoryTransaction.count({ where: { item_id: receiptItem.id, notes: { [Op.like]: '%PO-INVALID%' } }, transaction }), 0);
  assert.deepEqual(await inventoryScope(hostels[0].id, transaction), await inventoryScope(hostels[1].id, transaction));
  const balance = async id => Number((await ItemStock.findOne({ where: { inventory_id: id, item_id: item.id }, transaction })).current_stock);
  assert.equal(await balance(pool.id), 120);
  assert.equal(await ItemStock.count({ where: { inventory_id: pool.id, item_id: item.id }, transaction }), 1);
  const consume = async (hostel, quantity) => _recordBulkConsumptionLogic([{ item_id: item.id, quantity_consumed: quantity, meal_type: 'lunch', consumption_date: '2026-10-17' }], hostel.id, actor.userId, transaction);
  await consume(hostels[0], 30);
  await consume(hostels[1], 10);
  assert.equal(await balance(pool.id), 80);
  assert.equal(await balance(isolated.id), 10, 'another inventory remains isolated');
  const records = await DailyConsumption.findAll({ where: { inventory_id: pool.id, item_id: item.id }, transaction, raw: true });
  assert.deepEqual(records.map(row => row.hostel_id).sort((a,b) => a-b), [hostels[0].id, hostels[1].id]);
  assert.equal(Number((await RestockPlan.findOne({ where: { inventory_id: pool.id, item_id: item.id }, transaction })).quantity_needed), 40);
  await assert.rejects(() => consume(hostels[1], 81), /Not enough stock/);
  assert.equal(await balance(pool.id), 80);
  for (const hostel of hostels.slice(0, 2)) {
    const res = response(); await getItemStock(request(hostel), res);
    assert.equal(res.statusCode, 200, res.body?.message);
    assert.equal(res.body.data.find(row => row.item_id === item.id).current_stock, 80);
  }
  const correction = response();
  await correctLastPurchase(request(hostels[0], { item_id: item.id, new_quantity: 25, new_unit_price: 7 }), correction);
  assert.equal(correction.statusCode, 200, correction.body?.message);
  assert.equal(await balance(pool.id), 85);
  const returned = response();
  await recordItemReturn(request(hostels[1], { items: [{ item_id: item.id, quantity_returned: 2 }] }), returned);
  assert.equal(returned.statusCode, 201, returned.body?.message);
  assert.equal(await balance(pool.id), 87);
  const afterReturn = response();
  await correctLastPurchase(request(hostels[0], { item_id: item.id, new_quantity: 30, new_unit_price: 7 }), afterReturn);
  assert.match(afterReturn.body.message, /consumption or returns/);
  assert.equal(await balance(pool.id), 87, 'a batch touched by returns cannot be reset by purchase correction');
  const activeBatchTotal = await InventoryBatch.sum('quantity_remaining', { where: { inventory_id: pool.id, item_id: item.id }, transaction });
  assert.equal(Number(activeBatchTotal), await balance(pool.id));

  const assign = async combine_stock => {
    const req = request(hostels[0], { name: pool.name, hostel_ids: hostels.map(row => row.id), combine_stock }); req.params.id = pool.id;
    const res = response(); await saveInventory(req, res); return res;
  };
  assert.equal((await assign(false)).statusCode, 400, 'pooling existing stock requires explicit confirmation');
  assert.equal(await balance(isolated.id), 10);
  const combined = await assign(true);
  assert.equal(combined.statusCode, 200, combined.body?.message);
  assert.equal(await balance(pool.id), 97);
  assert.equal(await ItemStock.count({ where: { inventory_id: pool.id, item_id: item.id }, transaction }), 1);
  assert.equal(await InventoryBatch.count({ where: { inventory_id: isolated.id }, transaction }), 0);
  assert.equal(await InventoryTransaction.count({ where: { inventory_id: pool.id, item_id: item.id }, transaction }), 3);
  assert.deepEqual(await inventoryScope(hostels[2].id, transaction), { inventory_id: pool.id });
  const listing = response(); await listInventories({ user: { role: 'mess', hostel_id: hostels[1].id } }, listing);
  assert.equal(listing.body.data.length, 1); assert.equal(listing.body.data[0].hostels.length, 3);
  assert.equal((await assign(true)).statusCode, 200);
  assert.equal(await balance(pool.id), 97, 'saving unchanged assignments never combines stock twice');
  const split = response();
  const splitRequest = request(hostels[1], { name: isolated.name, hostel_ids: [hostels[1].id], combine_stock: false });
  splitRequest.params.id = isolated.id;
  await saveInventory(splitRequest, split);
  assert.equal(split.statusCode, 200, split.body?.message);
  assert.deepEqual(await inventoryScope(hostels[1].id, transaction), { inventory_id: isolated.id });
  assert.equal(await balance(pool.id), 97, 'moving one hostel out of a group leaves stock in the original inventory');
  assert.equal(await ItemStock.count({ where: { inventory_id: isolated.id }, transaction }), 0);
  console.log('PASS: received orders, duplicate receipt protection, atomic rollback, weighted rates, consumption-only expenses, shared purchases, FIFO depletion, hostel attribution, isolated pools, shared reports, returns, corrections, confirmed stock combining, and staff scope.');
} finally {
  sequelize.transaction = originalTransaction; sequelize.query = originalQuery;
  sequelize.removeHook('beforeFind', 'inventoryFixture'); sequelize.removeHook('beforeCount', 'inventoryFixture');
  await transaction.rollback(); await sequelize.close();
  console.log('All inventory integration fixtures rolled back.');
}
