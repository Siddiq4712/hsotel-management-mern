const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Guest = sequelize.define('Guest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  visiting_student_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  check_in_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  check_out_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  room_assigned: {
    type: DataTypes.STRING,
    allowNull: true
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('checked_in', 'checked_out', 'cancelled'),
    defaultValue: 'checked_in'
  },
  charges: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  }
}, {
  tableName: 'tbl_Guest',
  timestamps: true
});

module.exports = Guest;