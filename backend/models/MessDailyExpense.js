const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessDailyExpense = sequelize.define('MessDailyExpense', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  expense_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_ExpenseType',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  expense_date: {
    type: DataTypes.DATEONLY, // Date-only for daily expenses
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_MessDailyExpense',
  timestamps: true
});

module.exports = MessDailyExpense;