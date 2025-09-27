const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessCharge = sequelize.define('MessCharge', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  attendance_status: {
    type: DataTypes.ENUM('present', 'absent', 'leave'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  is_charged: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_MessCharges',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'date']
    }
  ]
});

module.exports = MessCharge;