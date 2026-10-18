export const RECEIVED_ORDER_PREFIX = 'Purchase order received: ';

export function parseReceivedOrderNotes(notes) {
  if (!notes?.startsWith(RECEIVED_ORDER_PREFIX)) return null;
  const [reference, receipt] = notes.slice(RECEIVED_ORDER_PREFIX.length).split('\nReceipt: ');
  return { reference, receipt: receipt || reference.toLowerCase() };
}

export function normalizeReceivedOrder(body = {}) {
  const reference = String(body.order_reference || '').trim();
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._/-]{0,79}$/.test(reference)) {
    throw new Error('Enter an order reference of 1–80 letters, numbers, spaces, dots, slashes, underscores or hyphens.');
  }
  const storeId = Number(body.store_id);
  if (!Number.isSafeInteger(storeId) || storeId <= 0) throw new Error('Choose a supplier store.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 200) throw new Error('Add between 1 and 200 items.');
  const seen = new Set();
  const items = body.items.map(row => {
    const id = Number(row.item_id), quantity = Number(row.quantity), price = Number(row.unit_price);
    if (!Number.isSafeInteger(id) || id <= 0 || seen.has(id)) throw new Error('Choose each item only once.');
    seen.add(id);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 99999999.99 || Math.abs(quantity * 100 - Math.round(quantity * 100)) > 0.00001) {
      throw new Error('Received quantities must be positive with at most two decimal places.');
    }
    if (row.unit_price === '' || row.unit_price == null || !Number.isFinite(price) || price < 0 || price > 99999999.99 || Math.abs(price * 100 - Math.round(price * 100)) > 0.00001) {
      throw new Error('Unit rates must be non-negative with at most two decimal places.');
    }
    return { item_id: id, store_id: storeId, quantity, unit_price: price };
  });
  return { reference, storeId, items };
}
