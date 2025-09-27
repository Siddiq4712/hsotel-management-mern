const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  menu_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Menu',
      key: 'id'
    }
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Item',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  unit_id: {  // Changed from 'unit' to 'unit_id'
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_UOM',
      key: 'id'
    },
    comment: 'Unit of measurement (linked to UOM)'
  },
  preparation_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_Menu_Item',
  timestamps: true
});

module.exports = MenuItem;