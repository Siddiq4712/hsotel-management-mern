const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ExpenseType = sequelize.define('ExpenseType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_ExpenseType',
  timestamps: true
});

module.exports = ExpenseType;