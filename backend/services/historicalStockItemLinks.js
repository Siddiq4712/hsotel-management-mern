import sequelize from '../config/database.js';

export async function loadHistoricalStockItemLinks(inventoryId, transaction) {
  let rows;
  try {
    [rows] = await sequelize.query(`
      SELECT DISTINCT receipt.item_id AS receiptItemId, batch.item_id AS stockItemId,
             item.name AS stockItemName, uom.abbreviation AS stockUnit
      FROM tbl_HistoricalPurchaseReceipt receipt
      JOIN tbl_InventoryBatch batch
        ON batch.id = JSON_EXTRACT(receipt.provenance, '$.live_batch_id')
        AND batch.inventory_id = receipt.inventory_id
        AND batch.item_id = JSON_EXTRACT(receipt.provenance, '$.live_stock_item_id')
      JOIN tbl_Item item ON item.id = batch.item_id
      LEFT JOIN tbl_UOM uom ON uom.id = item.unit_id
      WHERE receipt.inventory_id = :inventoryId AND receipt.item_id <> batch.item_id
    `, { replacements: { inventoryId }, transaction });
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE') return [];
    throw error;
  }
  return rows;
}

export function historicalStockItemError(links, itemId) {
  const id = Number(itemId);
  const aliases = links.filter(link => Number(link.receiptItemId) === id);
  if (aliases.length > 1) return 'This purchase item maps to multiple historical stock items. Resolve the item mapping before adding stock.';
  const link = aliases[0];
  if (link && link.stockUnit && link.stockUnit !== 'source') {
    return `This purchase item is linked to ${link.stockItemName} (item #${link.stockItemId}). Select that stock item and enter the quantity and unit price per ${link.stockUnit}.`;
  }
  const unresolved = link || links.find(row => Number(row.stockItemId) === id && (!row.stockUnit || row.stockUnit === 'source'));
  if (unresolved) return `The stock unit for ${unresolved.stockItemName} (item #${unresolved.stockItemId}) needs confirmation before adding stock.`;
  return null;
}
