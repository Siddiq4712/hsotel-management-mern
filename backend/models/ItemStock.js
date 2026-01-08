const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemStock = sequelize.define('ItemStock', {
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
  current_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total stock across all batches for this item and hostel',
  },
  minimum_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Minimum stock threshold for reordering',
  },
  last_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Last time stock was updated',
  },
  last_purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of the most recent batch purchase',
  },
}, {
  tableName: 'tbl_ItemStock',
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'hostel_id'] },
  ],
});

module.exports = ItemStock;