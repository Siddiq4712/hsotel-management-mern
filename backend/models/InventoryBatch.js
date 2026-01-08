const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryBatch = sequelize.define('InventoryBatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Item', key: 'id' },
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' },
  },
  quantity_purchased: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Original quantity purchased in this batch',
  },
  quantity_remaining: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Current quantity left in this batch',
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Purchase price per unit for this batch',
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date the batch was purchased',
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Optional expiry date for perishable items',
  },
  status: {
    type: DataTypes.ENUM('active', 'depleted', 'expired'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Batch status for FIFO management',
  },
}, {
  tableName: 'tbl_InventoryBatch',
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'hostel_id', 'purchase_date'] }, // Optimize FIFO queries
    { fields: ['status'] },
  ],
});

module.exports = InventoryBatch;