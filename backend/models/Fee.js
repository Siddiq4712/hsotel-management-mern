const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Fee = sequelize.define('Fee', {
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
  enrollment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Enrollment',
      key: 'id'
    },
    comment: 'Links fee to a specific enrollment period'
  },
  fee_type: {
    type: DataTypes.ENUM('hostel', 'mess', 'maintenance', 'security', 'emi', 'other'),
    allowNull: false,
    comment: 'Type of fee - added "emi" option for bed allocation EMI payments'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue', 'waived'),
    defaultValue: 'pending'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer', 'other'),
    allowNull: true,
    comment: 'Method used for payment, if paid'
  },
  transaction_id: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Reference ID for the payment transaction'
  },
  receipt_number: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Receipt number for the payment'
  },
  emi_month: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'For EMI payments, tracks which month in the sequence (1-5)'
  },
  collected_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Users',
      key: 'id'
    },
    comment: 'User who collected the payment'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Any additional notes about this fee or payment'
  }
}, {
  tableName: 'tbl_Fee',
  timestamps: true,
  indexes: [
    {
      fields: ['student_id']
    },
    {
      fields: ['enrollment_id']
    },
    {
      fields: ['fee_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['due_date']
    }
  ]
});

module.exports = Fee;