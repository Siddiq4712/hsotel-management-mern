import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const InventoryBillingPolicy = sequelize.define('InventoryBillingPolicy', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  inventory_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Inventory', key: 'id' } },
  effective_from: { type: DataTypes.DATEONLY, allowNull: false },
  mode: { type: DataTypes.ENUM('hostel', 'shared'), allowNull: false, defaultValue: 'shared' },
  hostel_ids: { type: DataTypes.JSON, allowNull: false },
  created_by: { type: DataTypes.INTEGER, allowNull: true },
}, { tableName: 'tbl_InventoryBillingPolicy', indexes: [{ unique: true, fields: ['inventory_id', 'effective_from'] }] });

export const InventoryMealEntry = sequelize.define('InventoryMealEntry', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  inventory_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Inventory', key: 'id' } },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  meal_type: { type: DataTypes.STRING(20), allowNull: false },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'tbl_InventoryMealEntry', indexes: [{ unique: true, fields: ['inventory_id', 'date', 'meal_type'] }] });
