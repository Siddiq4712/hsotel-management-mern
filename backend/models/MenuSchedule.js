const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MenuSchedule = sequelize.define('MenuSchedule', {
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
  menu_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Menu',
      key: 'id'
    }
  },
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  meal_time: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'served', 'cancelled'),
    defaultValue: 'scheduled'
  },
  // RENAMED for clarity, was actual_servings
  estimated_servings: {  
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated number of servings planned'
  },
  // NEW FIELD
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Total calculated cost for all ingredients'
  },
  // NEW FIELD
  cost_per_serving: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Calculated cost per individual serving'
  }
}, {
  tableName: 'tbl_MenuSchedule',
  timestamps: true
});

module.exports = MenuSchedule;