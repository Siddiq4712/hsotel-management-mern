import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export async function ensureBatchSchema() {
  const query = sequelize.getQueryInterface();
  const columns = await query.describeTable('tbl_Session');
  if (!columns.roll_prefix) await query.addColumn('tbl_Session', 'roll_prefix', { type: DataTypes.STRING(20), allowNull: true });
  if (!columns.hostel_id) await query.addColumn('tbl_Session', 'hostel_id', {
    type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_Hostel', key: 'id' }
  });
  const indexes = await query.showIndex('tbl_Session');
  if (!indexes.some(index => index.name === 'batch_roll_prefix_unique')) {
    await query.addIndex('tbl_Session', ['roll_prefix'], { name: 'batch_roll_prefix_unique', unique: true });
  }
}
