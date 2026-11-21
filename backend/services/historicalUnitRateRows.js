import sequelize from '../config/database.js';
import { policyError } from './inventoryBilling.js';

// Match the UNITRATE item names using the same spelling rules as the stock import.
function stockKey(name) {
  const key = String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').replace(/maavu/g, 'mavu');
  if (key.startsWith('nilakadalai')) return /fry|fried/.test(key) ? 'groundnutfried' : 'groundnutraw';
  if (/kond.*kadalai.*white/.test(key)) return 'chickpeawhite';
  if (key.startsWith('vellap')) return 'vellapoondu';
  if (key.startsWith('sapatuarisi')) return 'sapatuarisi';
  return key;
}

export async function loadHistoricalUnitRateRows(inventoryId, month, year) {
  if (Number(year) !== 2026 || ![7, 8, 9].includes(Number(month))) return null;
  let archive;
  try {
    [archive] = await sequelize.query(
      'SELECT payload FROM tbl_HistoricalMessInputs WHERE inventory_id = :inventoryId AND month = :month AND year = :year',
      { replacements: { inventoryId, month, year }, type: sequelize.QueryTypes.SELECT }
    );
  } catch (error) {
    if (error.original?.code === 'ER_NO_SUCH_TABLE') return null;
    throw error;
  }
  if (!archive) return null;
  const payload = typeof archive.payload === 'string' ? JSON.parse(archive.payload) : archive.payload;
  if (!Array.isArray(payload?.unitrate) || !payload.unitrate.length) {
    throw policyError('The imported opening-stock schedule is missing. Review the month source before exporting.');
  }
  const items = await sequelize.query(
    `SELECT item.name, unit.abbreviation
     FROM tbl_ItemStock stock
     JOIN tbl_Item item ON item.id = stock.item_id
     LEFT JOIN tbl_UOM unit ON unit.id = item.unit_id
     WHERE stock.inventory_id = :inventoryId`,
    { replacements: { inventoryId }, type: sequelize.QueryTypes.SELECT }
  );
  const units = new Map();
  for (const item of items) {
    const key = stockKey(item.name);
    units.set(key, units.has(key) ? null : item.abbreviation);
  }
  return payload.unitrate.map(({ values, row }) => {
    const [itemName, openingQty, oldRate, openingValue, purchaseQty, purchaseValue] = values.slice(1, 7);
    const quantities = [openingQty, oldRate, openingValue, purchaseQty, purchaseValue].map(value => Number(value ?? 0));
    if (typeof itemName !== 'string' || quantities.some(value => !Number.isFinite(value) || value < 0)) {
      throw policyError(`Invalid quantity or amount in the imported UNITRATE row ${row}.`);
    }
    const [opening_qty, old_unit_rate, opening_value, purchase_qty, purchase_amount] = quantities;
    return {
      item_name: itemName.trim(),
      unit_abbreviation: units.get(stockKey(itemName)) ?? null,
      opening_qty, old_unit_rate, opening_value, purchase_qty, purchase_amount,
      last_unit_price: purchase_qty ? purchase_amount / purchase_qty : 0
    };
  });
}
