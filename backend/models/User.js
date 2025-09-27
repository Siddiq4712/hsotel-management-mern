const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// User model for authentication
// In your User model definition, add this field:
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('student', 'warden', 'admin', 'mess'),
    allowNull: false
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  is_active: {  // ADD THIS FIELD
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_Users',
  timestamps: true
});
