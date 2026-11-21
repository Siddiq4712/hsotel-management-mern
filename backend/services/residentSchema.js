import { DataTypes } from 'sequelize';

export async function ensureResidentSchema(database) {
  const query = database.getQueryInterface();
  const tables = (await query.showAllTables()).map(table => String(table).toLowerCase());
  if (tables.includes('tbl_users')) {
    const columns = await query.describeTable('tbl_users');
    if (!columns.resident_type) await query.addColumn('tbl_users', 'resident_type', {
      type: DataTypes.ENUM('student', 'staff'), allowNull: false, defaultValue: 'student'
    });
  }
  if (tables.includes('tbl_enrollment')) {
    const columns = await query.describeTable('tbl_Enrollment');
    if (!columns.session_id.allowNull) await query.changeColumn('tbl_Enrollment', 'session_id', {
      type: DataTypes.INTEGER, allowNull: true
    });
  }
}
