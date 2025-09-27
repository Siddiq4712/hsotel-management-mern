const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyConsumptionReturn = sequelize.define('DailyConsumptionReturn', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  daily_consumption_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_DailyConsumption', key: 'id' },
  },
  returned_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' },
  },
  quantity_returned: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  return_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'tbl_DailyConsumptionReturn',
  timestamps: true,
});

module.exports = DailyConsumptionReturn;