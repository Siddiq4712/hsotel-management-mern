const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryTransaction = sequelize.define('InventoryTransaction', {
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
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Item',
      key: 'id'
    }
  },
  store_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Store',
      key: 'id'
    }
  },
  transaction_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  transaction_type: {
    type: DataTypes.ENUM('purchase', 'consumption'),
    allowNull: false
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_InventoryTransaction',
  timestamps: true
});

module.exports = InventoryTransaction;