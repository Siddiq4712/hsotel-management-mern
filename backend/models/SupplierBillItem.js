const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupplierBillItem = sequelize.define('SupplierBillItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_SupplierBill',
      key: 'id'
    }
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Item',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'tbl_SupplierBillItem',
  timestamps: true
});

module.exports = SupplierBillItem;