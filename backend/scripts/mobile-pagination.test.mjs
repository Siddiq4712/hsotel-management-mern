import test from 'node:test';
import assert from 'node:assert/strict';
import { paginationOptions, paginationMeta } from '../utils/pagination.js';
import { getTransactions, getMessBills } from '../controllers/studentController.js';
import { getFoodOrders } from '../controllers/messController.js';
import { Transaction, MessBill, FoodOrder } from '../models/index.js';

const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const request = query => ({ user: { role: 'student', userId: 73, hostel_id: 2 }, query });

test('pagination is opt-in, bounded, validates integers, and marks the final page', () => {
  assert.equal(paginationOptions({}), null);
  assert.deepEqual(paginationOptions({ page: '2', pageSize: '500' }), { page: 2, limit: 100, offset: 100 });
  assert.deepEqual(paginationMeta(paginationOptions({ page: '3' }), 45), { page: 3, pageSize: 20, total: 45, totalPages: 3, hasMore: false });
  for (const value of ['0', '-1', '1.5', 'bad', '', ['1', '2'], '99999999999999999999']) {
    assert.throws(() => paginationOptions({ page: value }), error => error.status === 400);
  }
});

test('transaction pages preserve ownership, filters, stable ordering and full-filter statistics', async t => {
  t.mock.method(Transaction, 'findAndCountAll', async options => {
    assert.deepEqual(options.where, { student_id: 73, status: 'completed' });
    assert.equal(options.limit, 20); assert.equal(options.offset, 20);
    assert.deepEqual(options.order, [['createdAt', 'DESC'], ['id', 'DESC']]);
    return { rows: [{ id: 30, amount: '12.00' }], count: 55 };
  });
  t.mock.method(Transaction, 'findAll', async options => {
    assert.equal(options.raw, true); assert.equal(options.where.student_id, 73);
    return [{ totalAmount: '1000.00', completed: '55', pending: '0' }];
  });
  const res = response();
  await getTransactions(request({ page: '2', status: 'completed' }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pagination.total, 55);
  assert.equal(res.body.summary.totalAmount, 1000);
  assert.equal(res.body.summary.completed, 55);
  assert.equal(res.body.data.length, 1);
});

test('bill pages retain complete monthly totals rather than totals of the loaded page', async t => {
  t.mock.method(MessBill, 'findAndCountAll', async options => {
    assert.deepEqual(options.where, { student_id: 73, month: 10, year: 2026 });
    assert.equal(options.limit, 20);
    return { rows: [{ id: 5, amount: '20' }], count: 24 };
  });
  t.mock.method(MessBill, 'findAll', async () => [{ totalAmount: '2400', paidAmount: '2000', pendingAmount: '400', overdueAmount: null }]);
  const res = response();
  await getMessBills(request({ page: '1', month: '10', year: '2026' }), res);
  assert.deepEqual(res.body.summary, { totalAmount: 2400, paidAmount: 2000, pendingAmount: 400, overdueAmount: 0 });
  assert.equal(res.body.pagination.hasMore, true);
});

test('food pages count orders rather than item joins and students cannot override ownership', async t => {
  t.mock.method(FoodOrder, 'findAll', async options => {
    assert.equal(options.where.student_id, 73);
    assert.equal(options.limit, 20); assert.equal(options.offset, 20);
    assert.deepEqual(options.order, [['order_date', 'DESC'], ['id', 'DESC']]);
    return [{ id: 25, FoodOrderItems: [{ id: 1 }, { id: 2 }] }];
  });
  t.mock.method(FoodOrder, 'count', async options => { assert.equal(options.where.student_id, 73); return 21; });
  const res = response();
  await getFoodOrders(request({ page: '2', student_id: '999' }), res);
  assert.equal(res.body.pagination.total, 21);
  assert.equal(res.body.pagination.hasMore, false);
  assert.equal(res.body.data[0].FoodOrderItems.length, 2);
});

test('legacy web callers still receive all rows without pagination metadata', async t => {
  for (const [model, handler] of [[Transaction, getTransactions], [MessBill, getMessBills], [FoodOrder, getFoodOrders]]) {
    t.mock.method(model, 'findAll', async options => {
      assert.equal(options.limit, undefined);
      return Array.from({ length: 101 }, (_, id) => ({ id }));
    });
    const res = response();
    await handler(request({}), res);
    assert.equal(res.body.data.length, 101);
    assert.equal(res.body.pagination, undefined);
  }
});

test('invalid pagination returns 400 before issuing database reads', async t => {
  for (const [model, handler] of [[Transaction, getTransactions], [MessBill, getMessBills], [FoodOrder, getFoodOrders]]) {
    t.mock.method(model, 'findAll', async () => { assert.fail('Invalid pages must not query the database'); });
    t.mock.method(model, 'findAndCountAll', async () => { assert.fail('Invalid pages must not query the database'); });
    const res = response();
    await handler(request({ page: '-1' }), res);
    assert.equal(res.statusCode, 400);
  }
});

test('staff food pagination retains hostel scope and explicit student filters', async t => {
  const verify = options => {
    assert.deepEqual(options.where, { hostel_id: 4, student_id: '8' });
  };
  t.mock.method(FoodOrder, 'findAll', async options => { verify(options); return []; });
  t.mock.method(FoodOrder, 'count', async options => { verify(options); return 0; });
  const res = response();
  await getFoodOrders({ user: { role: 'mess', hostel_id: 4 }, query: { page: '1', student_id: '8' } }, res);
  assert.equal(res.body.pagination.total, 0);
  assert.equal(res.body.pagination.hasMore, false);
});
