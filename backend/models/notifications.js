import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// Deduplication is separate so existing notification rows and parent APIs stay valid.
export const NotificationDispatch = sequelize.define('NotificationDispatch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  event_key: { type: DataTypes.STRING(64), allowNull: false },
  notification_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName:'tbl_NotificationDispatch', updatedAt:false,
  indexes:[{unique:true,fields:['event_key','user_id']}] });
