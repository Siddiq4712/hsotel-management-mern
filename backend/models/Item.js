const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Item = sequelize.define('Item', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_ItemCategory',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  unit_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_UOM',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_Item',
  timestamps: true
});

module.exports = Item;