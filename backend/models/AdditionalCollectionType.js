const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdditionalCollectionType = sequelize.define('AdditionalCollectionType', {
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
  default_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_AdditionalCollectionType',
  timestamps: true
});

module.exports = AdditionalCollectionType;