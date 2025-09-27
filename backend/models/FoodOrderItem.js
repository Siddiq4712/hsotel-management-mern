const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FoodOrderItem = sequelize.define('FoodOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  food_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_FoodOrder',
      key: 'id'
    }
  },
  food_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_SpecialFoodItem',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_FoodOrderItem',
  timestamps: true
});

module.exports = FoodOrderItem;