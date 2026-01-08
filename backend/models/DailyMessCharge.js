const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DailyMessCharge = sequelize.define('DailyMessCharge', {
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
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  attendance_status: {
    type: DataTypes.ENUM('present', 'absent', 'leave', 'not_marked'),
    allowNull: false
  },
  is_charged: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'tbl_DailyMessCharge',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'date']
    }
  ]
});

module.exports = DailyMessCharge;