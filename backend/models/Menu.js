const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Menu = sequelize.define('Menu', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  description: {  // Add this field
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimated_servings: {  // Add this field
    type: DataTypes.INTEGER,
    allowNull: true
  },
  preparation_time: {  // Add this field
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Preparation time in minutes'
  }
}, {
  tableName: 'tbl_Menu',
  timestamps: true
});

module.exports = Menu;