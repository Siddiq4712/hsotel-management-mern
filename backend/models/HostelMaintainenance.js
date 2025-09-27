const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HostelMaintenance = sequelize.define('HostelMaintenance', {
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
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_HostelRoom',
      key: 'id'
    }
  },
  facility_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_HostelFacility',
      key: 'id'
    }
  },
  issue_type: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
    defaultValue: 'medium'
  },
  status: {
    type: DataTypes.ENUM('reported', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'reported'
  },
  reported_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  assigned_to: {
    type: DataTypes.STRING,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  completion_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tbl_HostelMaintenance',
  timestamps: true
});

module.exports = HostelMaintenance;