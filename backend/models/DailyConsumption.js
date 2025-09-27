const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyConsumption = sequelize.define('DailyConsumption', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' },
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Item', key: 'id' },
  },
  consumption_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  quantity_consumed: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Total quantity consumed for this item on this date',
  },
  unit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_UOM', key: 'id' },
    comment: 'Unit of measurement (linked to UOM)',
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false,
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' },
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total cost of consumption based on FIFO batches',
  },
}, {
  tableName: 'tbl_DailyConsumption',
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'hostel_id', 'consumption_date'] },
  ],
});

module.exports = DailyConsumption;