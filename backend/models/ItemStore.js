const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ItemStore = sequelize.define('ItemStore', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Item',
      key: 'id'
    }
  },
  store_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Store',
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  is_preferred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_purchased_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tbl_ItemStore',
  timestamps: true
});

module.exports = ItemStore;