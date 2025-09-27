const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const NonConsumables = sequelize.define('NonConsumables', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  condition: {
    type: DataTypes.ENUM('new', 'good', 'fair', 'poor', 'damaged'),
    defaultValue: 'good'
  },
  purchase_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchase_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'tbl_Nonconsumables',
  timestamps: true
});

module.exports = NonConsumables;