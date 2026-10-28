import { DataTypes } from 'sequelize';

export async function ensureRoomTemplateSchema(sequelize) {
  const query = sequelize.getQueryInterface();
  const columns = await query.describeTable('tbl_RoomType');
  if (!columns.is_active) await query.addColumn('tbl_RoomType', 'is_active', {
    type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true
  });
}
