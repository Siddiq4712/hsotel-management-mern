import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const PermissionPolicy = sequelize.define('PermissionPolicy', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  revision: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  grants: { type: DataTypes.JSON, allowNull: false },
}, { tableName: 'tbl_PermissionPolicy' });

export const PermissionHistory = sequelize.define('PermissionHistory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  revision: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  actor_id: { type: DataTypes.INTEGER, allowNull: false },
  actor_name: { type: DataTypes.STRING, allowNull: false },
  reason: { type: DataTypes.STRING(500), allowNull: false },
  changes: { type: DataTypes.JSON, allowNull: false },
}, { tableName: 'tbl_PermissionHistory', updatedAt: false });
