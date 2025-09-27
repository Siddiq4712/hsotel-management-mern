const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessFeesAllot = sequelize.define('MessFeesAllot', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_mess_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_students: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  individual_share: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  adjustments: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  final_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'tbl_MessFeesAllot',
  timestamps: true
});

module.exports = MessFeesAllot;