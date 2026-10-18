import { Op } from 'sequelize';
import { InventoryTransaction, Item, Store } from '../models/index.js';
import { inventoryScope } from '../services/inventoryScope.js';
import { normalizeReceivedOrder, RECEIVED_ORDER_PREFIX, parseReceivedOrderNotes } from '../services/receivedPurchaseOrder.js';
import { recordInventoryPurchase } from './messController.js';

export async function receivePurchaseOrder(req, res) {
  let order;
  try { order = normalizeReceivedOrder(req.body); }
  catch (error) { return res.status(400).json({ success: false, message: error.message }); }
  req.receivedOrderReference = order.reference;
  req.body = { items: order.items };
  return recordInventoryPurchase(req, res);
}

export async function listReceivedPurchaseOrders(req, res) {
  try {
    const rows = await InventoryTransaction.findAll({
      where: { ...(await inventoryScope(req.user.hostel_id)), transaction_type: 'purchase', notes: { [Op.like]: `${RECEIVED_ORDER_PREFIX}%` } },
      include: [{ model: Item }, { model: Store }], order: [['id', 'DESC']],
    });
    const groups = new Map();
    for (const row of rows) {
      const { reference, receipt } = parseReceivedOrderNotes(row.notes);
      const key = `${row.store_id}:${receipt}`;
      if (!groups.has(key)) groups.set(key, { key, order_reference: reference, store_id: row.store_id,
        store_name: row.Store?.name || 'Unknown store', received_date: row.transaction_date,
        status: 'received', total_amount: 0, items: [] });
      const order = groups.get(key);
      order.items.push({ id: row.id, item_id: row.item_id, item_name: row.Item?.name,
        quantity: Number(row.quantity), unit: row.unit, unit_price: Number(row.unit_price),
        total: Number(row.quantity) * Number(row.unit_price) });
      order.total_amount += Number(row.quantity) * Number(row.unit_price);
    }
    res.json({ success: true, data: [...groups.values()] });
  } catch (error) { res.status(error.status || 500).json({ success: false, message: error.message }); }
}
