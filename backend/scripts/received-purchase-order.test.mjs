import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReceivedOrder, parseReceivedOrderNotes, RECEIVED_ORDER_PREFIX } from '../services/receivedPurchaseOrder.js';

const valid = () => ({ order_reference: 'PO-2026/001', store_id: 2, items: [{ item_id: 1, quantity: 10, unit_price: 50 }] });
test('normalizes an order without accepting arbitrary stock or expense fields', () => {
  assert.deepEqual(normalizeReceivedOrder({ ...valid(), order_reference: ' PO-2026/001 ', expense_amount: 999 }), {
    reference: 'PO-2026/001', storeId: 2, items: [{ item_id: 1, store_id: 2, quantity: 10, unit_price: 50 }],
  });
});
test('rejects invalid references, quantities, rates, supplier and duplicate lines', () => {
  for (const patch of [{ order_reference: '' }, { order_reference: 'bad\nreceipt' }, { store_id: 0 }, { items: [] },
    { items: [...valid().items, ...valid().items] }, { items: [{ item_id: 1, quantity: 0, unit_price: 50 }] },
    { items: [{ item_id: 1, quantity: 1.234, unit_price: 50 }] }, { items: [{ item_id: 1, quantity: 10, unit_price: -1 }] },
    { items: [{ item_id: 1, quantity: 10, unit_price: null }] }]) {
    assert.throws(() => normalizeReceivedOrder({ ...valid(), ...patch }));
  }
});
test('reads durable receipt identity separately from supplier reference', () => {
  assert.deepEqual(parseReceivedOrderNotes(`${RECEIVED_ORDER_PREFIX}PO-001\nReceipt: receipt-id`), { reference: 'PO-001', receipt: 'receipt-id' });
  assert.equal(parseReceivedOrderNotes('ordinary purchase'), null);
});
