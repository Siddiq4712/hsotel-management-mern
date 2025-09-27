const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GroceriesType = sequelize.define('GroceriesType', {
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
  tableName: 'tbl_Groceries_Type',
  timestamps: true
});

module.exports = GroceriesType;