const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const HostelFacilityType = sequelize.define('HostelFacilityType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_HostelFacilityType',
  timestamps: true
});

module.exports = HostelFacilityType;