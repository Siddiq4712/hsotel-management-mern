const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Attendance = sequelize.define('Attendance', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' }
  },
  date: { // This 'date' is the primary date of the record
    type: DataTypes.DATEONLY,
    allowNull: false
  },
 status: {
    type: DataTypes.ENUM('P', 'A', 'OD'), 
    allowNull: false
  },
  from_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  to_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  // NEW/UPDATED: Changed from remarks to reason with ENUM
  reason: {
    type: DataTypes.ENUM('NCC', 'NSS', 'Internship', 'Other'),
    allowNull: true, // Only required for OD
  },
  remarks: { // Kept for general remarks or 'Other' reason
    type: DataTypes.TEXT,
    allowNull: true
  },
  marked_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' }
  }
}, {
  tableName: 'tbl_Attendance',
  timestamps: true
});

module.exports = Attendance;