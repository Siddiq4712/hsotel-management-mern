const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdditionalIncome = sequelize.define('AdditionalIncome', {
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
  income_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_IncomeType',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  received_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  received_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_AdditionalIncome',
  timestamps: true
});

module.exports = AdditionalIncome;