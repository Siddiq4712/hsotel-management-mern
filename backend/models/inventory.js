import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

export const Inventory = sequelize.define('Inventory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
}, { tableName: 'tbl_Inventory', timestamps: true });

// A hostel draws from one inventory; an inventory can supply many hostels.
export const InventoryHostel = sequelize.define('InventoryHostel', {
  hostel_id: { type: DataTypes.INTEGER, primaryKey: true },
  inventory_id: { type: DataTypes.INTEGER, allowNull: false,
    references: { model: 'tbl_Inventory', key: 'id' } },
}, { tableName: 'tbl_InventoryHostel', timestamps: true,
  indexes: [{ fields: ['inventory_id'] }] });
