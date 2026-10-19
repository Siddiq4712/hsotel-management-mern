import { DataTypes } from 'sequelize';

// Additive, repeatable upgrade: never use sync({ alter: true }) against existing financial data.
export async function ensureReductionSchema(sequelize) {
  const query = sequelize.getQueryInterface();
  const tables = (await query.showAllTables()).map(t => typeof t === 'string' ? t : t.tableName);
  const exists = name => tables.some(table => table.toLowerCase() === name.toLowerCase());
  if (exists('tbl_DayReductionRequests')) {
    const columns = await query.describeTable('tbl_DayReductionRequests');
    const additions = {
      category: { type: DataTypes.STRING(32), allowNull: true },
      activity: { type: DataTypes.STRING(150), allowNull: true },
      document: { type: DataTypes.JSON, allowNull: true },
      decided_at: { type: DataTypes.DATE, allowNull: true },
      workflow_version: { type: DataTypes.INTEGER, allowNull: true }
    };
    for (const [name, definition] of Object.entries(additions)) if (!columns[name]) await query.addColumn('tbl_DayReductionRequests', name, definition);
    if (!String(columns.status.type).includes('needs_correction')) {
      await query.changeColumn('tbl_DayReductionRequests', 'status', {
        type: DataTypes.ENUM('pending_admin', 'approved_by_admin', 'rejected_by_admin', 'approved_by_warden', 'rejected_by_warden', 'needs_correction', 'cancelled'),
        allowNull: false, defaultValue: 'pending_admin'
      });
    }
  }
  if (exists('tbl_Attendance')) {
    const columns = await query.describeTable('tbl_Attendance');
    if (!columns.reduction_request_id) await query.addColumn('tbl_Attendance', 'reduction_request_id', { type: DataTypes.INTEGER, allowNull: true });
  }
  if (exists('tbl_MessBill')) {
    const columns = await query.describeTable('tbl_MessBill');
    if (!columns.billing_breakdown) await query.addColumn('tbl_MessBill', 'billing_breakdown', { type: DataTypes.JSON, allowNull: true });
  }
}
