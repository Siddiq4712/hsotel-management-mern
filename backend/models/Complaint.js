const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Complaint = sequelize.define('Complaint', {
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
  subject: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('room', 'mess', 'facility', 'maintenance', 'discipline', 'other'),
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('submitted', 'in_progress', 'resolved', 'closed'),
    defaultValue: 'submitted'
  },
  assigned_to: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  resolved_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tbl_Complaint',
  timestamps: true
});

module.exports = Complaint;