import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export async function ensureBatchSchema() {
  const query = sequelize.getQueryInterface();
  const columns = await query.describeTable('tbl_Session');
  if (!columns.gender) await query.addColumn('tbl_Session', 'gender', { type: DataTypes.STRING(16), allowNull: true });
  const userColumns = await query.describeTable('tbl_users');
  if (!userColumns.gender) await query.addColumn('tbl_users', 'gender', { type: DataTypes.STRING(16), allowNull: true });
  if (!columns.erp_batch_year) await query.addColumn('tbl_Session', 'erp_batch_year', { type: DataTypes.INTEGER, allowNull: true });
  if (!columns.hostel_id) await query.addColumn('tbl_Session', 'hostel_id', {
    type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_Hostel', key: 'id' }
  });
  // Preserve configured batches while replacing their matching key with the full
  // admission year. Never infer individual students' ERP years from roll numbers.
  if (columns.roll_prefix) {
    await sequelize.query('UPDATE tbl_Session SET erp_batch_year = YEAR(start_date) WHERE erp_batch_year IS NULL AND roll_prefix IS NOT NULL AND hostel_id IS NOT NULL');
  }
  const indexes = await query.showIndex('tbl_Session');
  if (!indexes.some(index => index.name === 'batch_erp_year_gender_unique')) await query.addIndex('tbl_Session', ['erp_batch_year', 'gender'], { name: 'batch_erp_year_gender_unique', unique: true });
  if (indexes.some(index => index.name === 'batch_erp_year_unique')) await query.removeIndex('tbl_Session', 'batch_erp_year_unique');
  const enrollmentColumns = await query.describeTable('tbl_Enrollment');
  if (!enrollmentColumns.erp_batch_year) await query.addColumn('tbl_Enrollment', 'erp_batch_year', { type: DataTypes.INTEGER, allowNull: true });
}
