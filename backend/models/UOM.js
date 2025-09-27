const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UOM = sequelize.define('UOM', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  abbreviation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('weight', 'volume', 'length', 'count', 'other'),
    allowNull: false
  }
}, {
  tableName: 'tbl_UOM',
  timestamps: true
});

module.exports = UOM;