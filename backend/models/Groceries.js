const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Groceries = sequelize.define('Groceries', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  grocery_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Groceries_Type',
      key: 'id'
    }
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  current_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  minimum_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'tbl_Groceries',
  timestamps: true
});

module.exports = Groceries;