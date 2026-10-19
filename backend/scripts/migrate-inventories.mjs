import fs from 'node:fs/promises';
import path from 'node:path';
import sequelize from '../config/database.js';
import { ensureInventorySchema } from '../services/inventorySchema.js';

try {
  const tables = ['tbl_ItemStock', 'tbl_InventoryBatch', 'tbl_InventoryTransaction', 'tbl_RestockPlan', 'tbl_DailyConsumption', 'tbl_MessDailyExpense'];
  const backup = {};
  for (const table of tables) backup[table] = await sequelize.query(`SELECT * FROM \`${table}\``, { type: sequelize.QueryTypes.SELECT });
  const directory = path.resolve('import-work/inventory-backups');
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, `before-inventory-upgrade-${Date.now()}.json`);
  await fs.writeFile(file, JSON.stringify(backup, null, 2), { flag: 'wx' });
  await ensureInventorySchema();
  for (const table of tables) {
    const after = await sequelize.query(`SELECT * FROM \`${table}\``, { type: sequelize.QueryTypes.SELECT });
    const stripInventory = rows => JSON.stringify(rows.map(({ inventory_id, updatedAt, ...row }) => row).sort((a,b) => a.id-b.id));
    if (stripInventory(backup[table]) !== stripInventory(after)) throw new Error(`Unexpected data change in ${table}; inspect backup ${file}`);
  }
  console.log(`Inventory schema ready. Existing quantities, prices, and consumption preserved. Backup: ${file}`);
} finally { await sequelize.close(); }
