const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const IncomeType = sequelize.define('IncomeType', {
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
  tableName: 'tbl_IncomeType',
  timestamps: true
});

module.exports = IncomeType;