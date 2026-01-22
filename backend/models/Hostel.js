const { DataTypes } = require('sequelize');
<<<<<<< HEAD
const sequelize = require('../config/database');
=======
const sequelize = require('../../config/database');
>>>>>>> 07e366b0cc7bd2cfefe77436bb7a497c07bba16d

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
<<<<<<< HEAD
  latitude:       { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude:      { type: DataTypes.DECIMAL(11, 8), allowNull: true },
=======
>>>>>>> 07e366b0cc7bd2cfefe77436bb7a497c07bba16d
  capacity:       { type: DataTypes.INTEGER, allowNull: false },
  is_active:      { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'tbl_Hostel',
  timestamps: true
});

module.exports = Hostel;
