const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemCategory = sequelize.define('ItemCategory', {
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
  }
}, {
  tableName: 'tbl_ItemCategory',
  timestamps: true
});

module.exports = ItemCategory;