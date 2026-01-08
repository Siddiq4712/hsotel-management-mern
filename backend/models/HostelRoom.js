const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const HostelRoom = sequelize.define('HostelRoom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Hostel,
      key: 'id'
    }
  },
  room_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: RoomType,
      key: 'id'
    }
  },
  room_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  floor: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // NEW: This field tracks the number of students.
  occupancy_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  is_occupied: { // This field is likely present in the model
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'tbl_HostelRoom',
  timestamps: true
});
module.exports=HostelRoom;