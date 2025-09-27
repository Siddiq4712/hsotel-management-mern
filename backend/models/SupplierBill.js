const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SupplierBill = sequelize.define('SupplierBill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Supplier',
      key: 'id'
    }
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  purchase_order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_PurchaseOrder',
      key: 'id'
    }
  },
  bill_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bill_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tbl_SupplierBill',
  timestamps: true
});

module.exports = SupplierBill;