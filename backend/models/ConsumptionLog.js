const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConsumptionLog = sequelize.define('ConsumptionLog', {
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
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_InventoryBatch', key: 'id' },
  },
  quantity_consumed: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Quantity consumed from this batch',
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Cost of consumed quantity (quantity * batch unit_price)',
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false,
    comment: 'Meal type for which this consumption was recorded',
  },
}, {
  tableName: 'tbl_ConsumptionLog',
  timestamps: true,
  indexes: [
    { fields: ['daily_consumption_id'] },
    { fields: ['batch_id'] },
  ],
});

module.exports = ConsumptionLog;