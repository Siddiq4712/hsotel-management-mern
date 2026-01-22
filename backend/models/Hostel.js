const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Hostel = sequelize.define('Hostel', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: { name: 'unique_hostel_name', msg: 'Hostel name must be unique' }
  },
  address:        { type: DataTypes.TEXT, allowNull: true },
  contact_number: { type: DataTypes.STRING, allowNull: true },
  email:          { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
  latitude:       { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude:      { type: DataTypes.DECIMAL(11, 8), allowNull: true },
  capacity:       { type: DataTypes.INTEGER, allowNull: false },
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'tbl_Hostel',
  timestamps: true
});

module.exports = Hostel;
