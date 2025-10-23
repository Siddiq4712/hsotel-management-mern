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
    unique: false
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
    type: DataTypes.ENUM('student', 'warden', 'admin', 'mess','lapc'),
    allowNull: false
  },
  //Comment this out temporarily until DB is fixed
  roll_number: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  google_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  profile_picture: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_Users',
  timestamps: true
});

// Hostel Management Models
const Hostel = sequelize.define('Hostel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: {
      name: 'unique_hostel_name',
      msg: 'Hostel name must be unique'
    }
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contact_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_Hostel',
  timestamps: true
});

const RoomType = sequelize.define('RoomType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_RoomType',
  timestamps: true
});

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

const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_Session',
  timestamps: true
});

// In your Enrollment model
const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  roll_number: {  // NEW FIELD
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Hostel,
      key: 'id'
    }
  },
  session_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Session,
      key: 'id'
    }
  },
  enrollment_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  // Add these fields to the Enrollment model
  requires_bed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended'),
    defaultValue: 'active'
  },
   college: {
    type: DataTypes.ENUM('nec', 'lapc'),
    allowNull: true // Or false if it's a required field
  }
}, {
  tableName: 'tbl_Enrollment',
  timestamps: true
});


const RoomAllotment = sequelize.define('RoomAllotment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  room_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: HostelRoom,
      key: 'id'
    }
  },
  allotment_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  vacation_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_RoomAllotment', // Corrected typo
  timestamps: true
});

// Mess Management Models
const Menu = sequelize.define('Menu', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  description: {  // Add this field
    type: DataTypes.TEXT,
    allowNull: true
  },
  estimated_servings: {  // Add this field
    type: DataTypes.INTEGER,
    allowNull: true
  },
  preparation_time: {  // Add this field
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Preparation time in minutes'
  }
}, {
  tableName: 'tbl_Menu',
  timestamps: true
});

const ItemCategory = sequelize.define('ItemCategory', {
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
  }
}, {
  tableName: 'tbl_ItemCategory',
  timestamps: true
});
const UOM = sequelize.define('UOM', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  abbreviation: {
    type: DataTypes.STRING,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('weight', 'volume', 'length', 'count', 'other'),
    allowNull: false
  }
}, {
  tableName: 'tbl_UOM',
  timestamps: true
});


const Item = sequelize.define('Item', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: ItemCategory,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  unit_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: UOM,
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_Item',
  timestamps: true
});

const MessBill = sequelize.define('MessBill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Hostel,
      key: 'id'
    }
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue'),
    defaultValue: 'pending'
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'tbl_MessBill',
  timestamps: true
});
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

const HostelFacility = sequelize.define('HostelFacility', {
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
  facility_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_HostelFacilityType',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'maintenance'),
    defaultValue: 'active'
  },
  cost_per_use: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  }
}, {
  tableName: 'tbl_HostelFacility',
  timestamps: true
});

const HostelFacilityRegister = sequelize.define('HostelFacilityRegister', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  facility_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_HostelFacility',
      key: 'id'
    }
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  usage_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  duration_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_HostelFacilityRegister',
  timestamps: true
});

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

// FINANCE MANAGEMENT MODELS
const IncomeType = sequelize.define('IncomeType', {
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
  tableName: 'tbl_IncomeType',
  timestamps: true
});

const ExpenseType = sequelize.define('ExpenseType', {
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
  tableName: 'tbl_ExpenseType',
  timestamps: true
});

// WARDEN WORKFLOW MODELS
const Suspension = sequelize.define('Suspension', {
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
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('active', 'completed', 'cancelled'),
    defaultValue: 'active'
  },
  issued_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_Suspension',
  timestamps: true
});

// ... (imports)

// Updated Attendance Model
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
  hostel_id: {  
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' }
  },
  date: { 
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
  reason: {
    type: DataTypes.ENUM('NCC', 'NSS', 'Internship', 'Other'),
    allowNull: true, 
  },
  remarks: { 
    type: DataTypes.TEXT,
    allowNull: true
  },
  marked_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' }
  },
  totalManDays:{
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_monthly: {  // NEW FIELD: To identify monthly summary records
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'tbl_Attendance',
  timestamps: true
});
const Holiday = sequelize.define('Holiday', {
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
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('national', 'religious', 'institutional', 'other'),
    defaultValue: 'other'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_Holiday',
  timestamps: true
});

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

// Add associations
Fee.belongsTo(User, { foreignKey: 'collected_by', as: 'CollectedBy' });
Fee.belongsTo(Enrollment, { foreignKey: 'enrollment_id', as: 'Enrollment' });
Enrollment.hasMany(Fee, { foreignKey: 'enrollment_id', as: 'Fees' });

const AdditionalCollectionType = sequelize.define('AdditionalCollectionType', {
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
  default_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_AdditionalCollectionType',
  timestamps: true
});

const AdditionalCollection = sequelize.define('AdditionalCollection', {
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
  collection_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_AdditionalCollectionType',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  collected_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  collection_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('pending', 'collected', 'waived'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'tbl_AdditionalCollection',
  timestamps: true
});

const AdditionalIncome = sequelize.define('AdditionalIncome', {
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
  income_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_IncomeType',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  received_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  received_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_AdditionalIncome',
  timestamps: true
});

const Rebate = sequelize.define('Rebate', {
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
  rebate_type: {
    type: DataTypes.ENUM('mess', 'hostel', 'facility', 'other'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  from_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  to_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  }
}, {
  tableName: 'tbl_Rebate',
  timestamps: true
});

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

// STUDENT WORKFLOW MODELS
const Leave = sequelize.define('Leave', {
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
  leave_type: {
    type: DataTypes.ENUM('casual', 'sick', 'emergency', 'vacation', 'other'),
    allowNull: false
  },
  from_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  to_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending'
  },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  approved_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_Leaves',
  timestamps: true
});

const Transaction = sequelize.define('Transaction', {
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
  transaction_type: {
    type: DataTypes.ENUM('payment', 'refund', 'adjustment'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'card', 'online', 'upi', 'bank_transfer'),
    allowNull: false
  },
  reference_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  processed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_Transaction',
  timestamps: true
});

// MESS WORKFLOW MODELS
const MenuItem = sequelize.define('MenuItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  menu_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Menu',
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
  quantity: {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: false
  },
  unit_id: {  // Changed from 'unit' to 'unit_id'
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_UOM',
      key: 'id'
    },
    comment: 'Unit of measurement (linked to UOM)'
  },
  preparation_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_Menu_Item',
  timestamps: true
});

const MenuSchedule = sequelize.define('MenuSchedule', {
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
  menu_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Menu',
      key: 'id'
    }
  },
  scheduled_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  meal_time: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('scheduled', 'served', 'cancelled'),
    defaultValue: 'scheduled'
  },
  // RENAMED for clarity, was actual_servings
  estimated_servings: {  
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated number of servings planned'
  },
  // NEW FIELD
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Total calculated cost for all ingredients'
  },
  // NEW FIELD
  cost_per_serving: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Calculated cost per individual serving'
  }
}, {
  tableName: 'tbl_MenuSchedule',
  timestamps: true
});

const Token = sequelize.define('Token', {
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
  token_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('active', 'used', 'expired'),
    defaultValue: 'active'
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tbl_Token',
  timestamps: true
});

const Groceries = sequelize.define('Groceries', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  grocery_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Groceries_Type',
      key: 'id'
    }
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  current_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  minimum_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'tbl_Groceries',
  timestamps: true
});

const GroceriesType = sequelize.define('GroceriesType', {
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
  }
}, {
  tableName: 'tbl_Groceries_Type',
  timestamps: true
});

const ItemStock = sequelize.define('ItemStock', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Item', key: 'id' },
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' },
  },
  current_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total stock across all batches for this item and hostel',
  },
  minimum_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Minimum stock threshold for reordering',
  },
  last_updated: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Last time stock was updated',
  },
  last_purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date of the most recent batch purchase',
  },
}, {
  tableName: 'tbl_ItemStock',
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'hostel_id'] },
  ],
});
const DailyConsumption = sequelize.define('DailyConsumption', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' },
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Item', key: 'id' },
  },
  consumption_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  quantity_consumed: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Total quantity consumed for this item on this date',
  },
  unit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_UOM', key: 'id' },
    comment: 'Unit of measurement (linked to UOM)',
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false,
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' },
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total cost of consumption based on FIFO batches',
  },
}, {
  tableName: 'tbl_DailyConsumption',
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'hostel_id', 'consumption_date'] },
  ],
});

const NonConsumables = sequelize.define('NonConsumables', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  condition: {
    type: DataTypes.ENUM('new', 'good', 'fair', 'poor', 'damaged'),
    defaultValue: 'good'
  },
  purchase_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  purchase_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  }
}, {
  tableName: 'tbl_Nonconsumables',
  timestamps: true
});

const OtherItems = sequelize.define('OtherItems', {
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
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  current_stock: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  }
}, {
  tableName: 'tbl_Otheritems',
  timestamps: true
});

const Supplier = sequelize.define('Supplier', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  contact_person: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  supplier_type: {
    type: DataTypes.ENUM('groceries', 'vegetables', 'dairy', 'meat', 'other'),
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_Supplier',
  timestamps: true
});

const PurchaseOrder = sequelize.define('PurchaseOrder', {
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
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Supplier',
      key: 'id'
    }
  },
  order_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expected_delivery: {
    type: DataTypes.DATE,
    allowNull: true
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'confirmed', 'delivered', 'cancelled'),
    defaultValue: 'draft'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_PurchaseOrder',
  timestamps: true
});

const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  purchase_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_PurchaseOrder',
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
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'tbl_PurchaseOrderItem',
  timestamps: true
});

const SupplierBill = sequelize.define('SupplierBill', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Supplier',
      key: 'id'
    }
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  purchase_order_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_PurchaseOrder',
      key: 'id'
    }
  },
  bill_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  bill_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'),
    defaultValue: 'pending'
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tbl_SupplierBill',
  timestamps: true
});

const SupplierBillItem = sequelize.define('SupplierBillItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  supplier_bill_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_SupplierBill',
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
  quantity: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'tbl_SupplierBillItem',
  timestamps: true
});

const MessFeesAllot = sequelize.define('MessFeesAllot', {
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
  month: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total_mess_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  total_students: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  individual_share: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  adjustments: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  },
  final_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  tableName: 'tbl_MessFeesAllot',
  timestamps: true
});

const OtherExpense = sequelize.define('OtherExpense', {
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
  expense_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_ExpenseType',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expense_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
      },
  approved_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  }
}, {
  tableName: 'tbl_OtherExpense',
  timestamps: true
});

const MessDailyExpense = sequelize.define('MessDailyExpense', {
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
  expense_type_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_ExpenseType',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  expense_date: {
    type: DataTypes.DATEONLY, // Date-only for daily expenses
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  description: {
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
  tableName: 'tbl_MessDailyExpense',
  timestamps: true
});

// GUEST MANAGEMENT
const Guest = sequelize.define('Guest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  visiting_student_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'tbl_Users',
      key: 'id'
    }
  },
  check_in_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  check_out_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  room_assigned: {
    type: DataTypes.STRING,
    allowNull: true
  },
  purpose: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('checked_in', 'checked_out', 'cancelled'),
    defaultValue: 'checked_in'
  },
  charges: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 0.00
  }
}, {
  tableName: 'tbl_Guest',
  timestamps: true
});
// Add this new model to your models/index.js file
const MessCharge = sequelize.define('MessCharge', {
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
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  attendance_status: {
    type: DataTypes.ENUM('present', 'absent', 'leave'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  is_charged: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_MessCharges',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'date']
    }
  ]
});
const DailyMessCharge = sequelize.define('DailyMessCharge', {
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
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  attendance_status: {
    type: DataTypes.ENUM('present', 'absent', 'on_duty', 'not_marked'),
    allowNull: false
  },
  is_charged: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  }
}, {
  tableName: 'tbl_DailyMessCharge',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['student_id', 'date']
    }
  ]
});
// Store Model
const Store = sequelize.define('Store', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contact_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'tbl_Store',
  timestamps: true
});

// ItemStore mapping model
const ItemStore = sequelize.define('ItemStore', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
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
    allowNull: false,
    references: {
      model: 'tbl_Store',
      key: 'id'
    }
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  is_preferred: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  last_purchased_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tbl_ItemStore',
  timestamps: true
});

// Inventory Transaction Model for tracking purchases and consumption
// models/index.js - PARTIAL UPDATE: Find this section and modify it.

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
  // Removed the old 'transaction_date' (which was the inward_date)
  // Renamed 'invoice_date' to 'transaction_date' to be the single date field
  transaction_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date when the inventory transaction (e.g., purchase) occurred / Date on the supplier invoice'
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

  const SpecialFoodItem = sequelize.define('SpecialFoodItem', {
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
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  preparation_time_minutes: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_available: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image_url: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'tbl_SpecialFoodItem',
  timestamps: true
});

// FoodOrder Model (for special food items)
const FoodOrder = sequelize.define('FoodOrder', {
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
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_Hostel',
      key: 'id'
    }
  },
  order_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  requested_time: {
    type: DataTypes.DATE,
    allowNull: false
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    defaultValue: 'pending'
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'refunded'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_FoodOrder',
  timestamps: true
});

// FoodOrderItem Model (for individual items in an order)
const FoodOrderItem = sequelize.define('FoodOrderItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  food_order_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_FoodOrder',
      key: 'id'
    }
  },
  food_item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'tbl_SpecialFoodItem',
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  subtotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  special_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'tbl_FoodOrderItem',
  timestamps: true
});
const Concern = sequelize.define('Concern', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'The specific name, e.g., "K.R. Memorial Scholarship Meeting"',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'tbl_Concern',
  timestamps: true,
});

const InventoryBatch = sequelize.define('InventoryBatch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Item', key: 'id' },
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' },
  },
  quantity_purchased: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Original quantity purchased in this batch',
  },
  quantity_remaining: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Current quantity left in this batch',
  },
  unit_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Purchase price per unit for this batch',
  },
  purchase_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: 'Date the batch was purchased',
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Optional expiry date for perishable items',
  },
  status: {
    type: DataTypes.ENUM('active', 'depleted', 'expired'),
    allowNull: false,
    defaultValue: 'active',
    comment: 'Batch status for FIFO management',
  },
}, {
  tableName: 'tbl_InventoryBatch',
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'hostel_id', 'purchase_date'] }, // Optimize FIFO queries
    { fields: ['status'] },
  ],
});
// Remove the beforeCreate hook from this model definition
const ConsumptionLog = sequelize.define('ConsumptionLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  daily_consumption_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_DailyConsumption', key: 'id' },
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_InventoryBatch', key: 'id' },
  },
  quantity_consumed: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Quantity consumed from this batch',
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Cost of consumed quantity (quantity * batch unit_price)',
  },
  meal_type: {
    type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'),
    allowNull: false,
    comment: 'Meal type for which this consumption was recorded',
  },
}, {
  tableName: 'tbl_ConsumptionLog',
  timestamps: true,
  indexes: [
    { fields: ['daily_consumption_id'] },
    { fields: ['batch_id'] },
  ],
});
const DailyConsumptionReturn = sequelize.define('DailyConsumptionReturn', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  daily_consumption_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_DailyConsumption', key: 'id' },
  },
  returned_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' },
  },
  quantity_returned: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  return_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'tbl_DailyConsumptionReturn',
  timestamps: true,
});
// In your models file (e.g., models/index.js)

// ... other model definitions

// NEW: Special Consumption Model
const CreditToken = sequelize.define('CreditToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' },
  },
    concern_id: { // Replaces 'name' and 'description'
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Concern', key: 'id' },
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' },
  },
}, {
  tableName: 'tbl_CreditToken',
  timestamps: true,
});
const SpecialConsumption = sequelize.define('SpecialConsumption', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'Descriptive name for the consumption event, e.g., "Annual Day Celebration"',
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  consumption_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' },
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: 'Total calculated cost of all items consumed in this event',
  },
}, {
  tableName: 'tbl_SpecialConsumption',
  timestamps: true,
});

// NEW: Special Consumption Item Model
const SpecialConsumptionItem = sequelize.define('SpecialConsumptionItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  special_consumption_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_SpecialConsumption', key: 'id' },
  },
  item_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Item', key: 'id' },
  },
  daily_consumption_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_DailyConsumption', key: 'id' },
    comment: 'Links to the underlying consumption record which handled stock deduction'
  },
  quantity_consumed: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  unit_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_UOM', key: 'id' },
  },
  cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: 'Cost of this specific item line, calculated via FIFO',
  },
}, {
  tableName: 'tbl_SpecialConsumptionItem',
  timestamps: false, // These are just log entries, timestamps on parent are enough
});
// In your main models file (e.g., models/index.js)

// ... after the 'FoodOrderItem' or 'Fee' model definition ...

const StudentFee = sequelize.define('StudentFee', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' }
  },
  hostel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Hostel', key: 'id' }
  },
  fee_type: {
    type: DataTypes.STRING, // e.g., 'water_bill', 'fine', 'other_expense'
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  month: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Month this fee applies to (1-12)',
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Year this fee applies to',
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid'),
    defaultValue: 'pending',
  },
  issued_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'tbl_Users', key: 'id' }
  },
  issue_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'tbl_StudentFee',
  timestamps: true,
});

// NEW Associations for Special Consumption
SpecialConsumption.hasMany(SpecialConsumptionItem, { foreignKey: 'special_consumption_id', as: 'ItemsConsumed' });
SpecialConsumptionItem.belongsTo(SpecialConsumption, { foreignKey: 'special_consumption_id' });

SpecialConsumptionItem.belongsTo(Item, { foreignKey: 'item_id' });
SpecialConsumptionItem.belongsTo(UOM, { foreignKey: 'unit_id' });
SpecialConsumptionItem.belongsTo(DailyConsumption, { foreignKey: 'daily_consumption_id' });

SpecialConsumption.belongsTo(Hostel, { foreignKey: 'hostel_id' });
SpecialConsumption.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy' });

// Add associations
SpecialFoodItem.hasMany(FoodOrderItem, { foreignKey: 'food_item_id' });
FoodOrderItem.belongsTo(SpecialFoodItem, { foreignKey: 'food_item_id' });

FoodOrder.hasMany(FoodOrderItem, { foreignKey: 'food_order_id' });
FoodOrderItem.belongsTo(FoodOrder, { foreignKey: 'food_order_id' });

FoodOrder.belongsTo(User, { foreignKey: 'student_id', as: 'Student' });
FoodOrder.belongsTo(Hostel, { foreignKey: 'hostel_id' });
// Add associations
Store.hasMany(ItemStore, { foreignKey: 'store_id' });
ItemStore.belongsTo(Store, { foreignKey: 'store_id' });

Item.hasMany(ItemStore, { foreignKey: 'item_id' });
ItemStore.belongsTo(Item, { foreignKey: 'item_id' });

InventoryTransaction.belongsTo(Item, { foreignKey: 'item_id' });
InventoryTransaction.belongsTo(Store, { foreignKey: 'store_id' });
InventoryTransaction.belongsTo(Hostel, { foreignKey: 'hostel_id' });
InventoryTransaction.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy' });

CreditToken.belongsTo(Hostel, { foreignKey: 'hostel_id' });
CreditToken.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy' });

Concern.hasMany(CreditToken, { foreignKey: 'concern_id' });
CreditToken.belongsTo(Concern, { foreignKey: 'concern_id', as: 'Concern' }); 


// Add associations for the new model
// Add associations for the new model
DailyMessCharge.belongsTo(User, { foreignKey: 'student_id', as: 'DailyMessChargeStudent' });
User.hasMany(DailyMessCharge, { foreignKey: 'student_id', as: 'DailyMessCharges' });
DailyMessCharge.belongsTo(Hostel, { foreignKey: 'hostel_id' });

// Define Associations
User.belongsTo(Hostel, { foreignKey: 'hostel_id' });
Hostel.hasMany(User, { foreignKey: 'hostel_id' });

HostelRoom.hasMany(RoomAllotment, { foreignKey: 'room_id', as: 'tbl_RoomAllotments' });

HostelRoom.belongsTo(Hostel, { foreignKey: 'hostel_id' });
HostelRoom.belongsTo(RoomType, { foreignKey: 'room_type_id' });
Hostel.hasMany(HostelRoom, { foreignKey: 'hostel_id' });
RoomType.hasMany(HostelRoom, { foreignKey: 'room_type_id' });

User.hasMany(Enrollment, { foreignKey: 'student_id', as: 'tbl_Enrollments' });
Enrollment.belongsTo(User, { foreignKey: 'student_id', as: 'EnrollmentStudent' });
Enrollment.belongsTo(Hostel, { foreignKey: 'hostel_id' });
Enrollment.belongsTo(Session, { foreignKey: 'session_id' });

User.hasMany(RoomAllotment, { foreignKey: 'student_id', as: 'tbl_RoomAllotments' });
RoomAllotment.belongsTo(User, { foreignKey: 'student_id', as: 'AllotmentStudent' });
RoomAllotment.belongsTo(HostelRoom, { foreignKey: 'room_id' });
// HostelRoom.hasMany(RoomAllotment, { foreignKey: 'room_id' });

User.hasMany(Leave, { foreignKey: 'student_id', as: 'StudentLeaves' });
User.hasMany(Leave, { foreignKey: 'approved_by', as: 'ApprovedLeaves' });
Leave.belongsTo(User, { foreignKey: 'student_id', as: 'Student' });
Leave.belongsTo(User, { foreignKey: 'approved_by', as: 'ApprovedBy' });

User.hasMany(Complaint, { foreignKey: 'student_id', as: 'StudentComplaints' });
User.hasMany(Complaint, { foreignKey: 'assigned_to', as: 'AssignedComplaints' });
Complaint.belongsTo(User, { foreignKey: 'student_id', as: 'Student' });
Complaint.belongsTo(User, { foreignKey: 'assigned_to', as: 'AssignedTo' });

User.hasMany(MessCharge, { foreignKey: 'student_id', as: 'MessCharges' });
MessCharge.belongsTo(User, { foreignKey: 'student_id', as: 'MessChargeStudent' });

Menu.belongsTo(Hostel, { foreignKey: 'hostel_id' });
Item.belongsTo(ItemCategory, { foreignKey: 'category_id' });
MessBill.belongsTo(User, { foreignKey: 'student_id', as: 'MessBillStudent' });
MessBill.belongsTo(Hostel, { foreignKey: 'hostel_id' });

// New associations for facility management
HostelFacility.belongsTo(Hostel, { foreignKey: 'hostel_id' });
HostelFacility.belongsTo(HostelFacilityType, { foreignKey: 'facility_type_id' });
Hostel.hasMany(HostelFacility, { foreignKey: 'hostel_id' });
HostelFacilityType.hasMany(HostelFacility, { foreignKey: 'facility_type_id' });

HostelFacilityRegister.belongsTo(HostelFacility, { 
  foreignKey: 'facility_id',
  as: 'facility'   
});
HostelFacilityRegister.belongsTo(User, { foreignKey: 'student_id', as: 'FacilityRegisterStudent' });
HostelFacility.hasMany(HostelFacilityRegister, { foreignKey: 'facility_id' ,as: 'facilityRegisters'});
User.hasMany(HostelFacilityRegister, { foreignKey: 'student_id', as: 'FacilityRegisters' });

HostelMaintenance.belongsTo(Hostel, { foreignKey: 'hostel_id' });
HostelMaintenance.belongsTo(HostelRoom, { foreignKey: 'room_id' });
HostelMaintenance.belongsTo(HostelFacility, { foreignKey: 'facility_id' });
HostelMaintenance.belongsTo(User, { foreignKey: 'reported_by', as: 'ReportedBy' });


// Suspension associations
Suspension.belongsTo(User, { foreignKey: 'student_id', as: 'Student' });
Suspension.belongsTo(User, { foreignKey: 'issued_by', as: 'IssuedBy' });
// Attendance associations
Attendance.belongsTo(User, { foreignKey: 'student_id', as: 'Student' });
Attendance.belongsTo(User, { foreignKey: 'marked_by', as: 'MarkedBy' });

// Holiday associations
Holiday.belongsTo(Hostel, { foreignKey: 'hostel_id' });
Hostel.hasMany(Holiday, { foreignKey: 'hostel_id' });

// Fee and collection associations
Fee.belongsTo(User, { foreignKey: 'student_id', as: 'FeeStudent' });
User.hasMany(Fee, { foreignKey: 'student_id', as: 'Fees' });

AdditionalCollection.belongsTo(User, { foreignKey: 'student_id', as: 'CollectionStudent' });
AdditionalCollection.belongsTo(User, { foreignKey: 'collected_by', as: 'CollectedBy' });
AdditionalCollection.belongsTo(AdditionalCollectionType, { foreignKey: 'collection_type_id' });

AdditionalIncome.belongsTo(Hostel, { foreignKey: 'hostel_id' });
AdditionalIncome.belongsTo(IncomeType, { foreignKey: 'income_type_id' });
AdditionalIncome.belongsTo(User, { foreignKey: 'received_by', as: 'IncomeReceivedBy' });

Rebate.belongsTo(User, { foreignKey: 'student_id', as: 'RebateStudent' });
Rebate.belongsTo(User, { foreignKey: 'approved_by', as: 'RebateApprovedBy' });

// Transaction associations
Transaction.belongsTo(User, { foreignKey: 'student_id', as: 'TransactionStudent' });
Transaction.belongsTo(User, { foreignKey: 'processed_by', as: 'ProcessedBy' });

// Menu and item associations
MenuItem.belongsTo(Menu, { foreignKey: 'menu_id' });
MenuItem.belongsTo(Item, { foreignKey: 'item_id' });
Menu.hasMany(MenuItem, { foreignKey: 'menu_id' });
Item.hasMany(MenuItem, { foreignKey: 'item_id' });

MenuSchedule.belongsTo(Hostel, { foreignKey: 'hostel_id' });
MenuSchedule.belongsTo(Menu, { foreignKey: 'menu_id' });

Token.belongsTo(User, { foreignKey: 'student_id', as: 'TokenStudent' });
User.hasMany(Token, { foreignKey: 'student_id', as: 'Tokens' });

// Grocery and stock associations
Groceries.belongsTo(GroceriesType, { foreignKey: 'grocery_type_id',as: 'type' });
GroceriesType.hasMany(Groceries, { foreignKey: 'grocery_type_id',as:'groceries' });

ItemStock.belongsTo(Item, { foreignKey: 'item_id' });
ItemStock.belongsTo(Hostel, { foreignKey: 'hostel_id' });
Item.hasMany(ItemStock, { foreignKey: 'item_id' });
Hostel.hasMany(ItemStock, { foreignKey: 'hostel_id' });
Item.hasMany(DailyConsumption, {foreignKey: "item_id"});
DailyConsumption.belongsTo(Hostel, { foreignKey: 'hostel_id' });
DailyConsumption.belongsTo(Item, { foreignKey: 'item_id' });
DailyConsumption.belongsTo(User, { foreignKey: 'recorded_by', as: 'ConsumptionRecordedBy' });

DailyConsumptionReturn.belongsTo(DailyConsumption, { foreignKey: "daily_consumption_id" });
DailyConsumptionReturn.belongsTo(User, { foreignKey: "returned_by", as: "ConsumptionReturnedBy" });

// Purchase and supplier associations
PurchaseOrder.belongsTo(Hostel, { foreignKey: 'hostel_id' });
PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id' });
PurchaseOrder.belongsTo(User, { foreignKey: 'created_by', as: 'PurchaseOrderCreatedBy' });

PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
PurchaseOrderItem.belongsTo(Item, { foreignKey: 'item_id' });
PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id' });

SupplierBill.belongsTo(Supplier, { foreignKey: 'supplier_id' });
SupplierBill.belongsTo(Hostel, { foreignKey: 'hostel_id' });
SupplierBill.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });

SupplierBillItem.belongsTo(SupplierBill, { foreignKey: 'supplier_bill_id' });
SupplierBillItem.belongsTo(Item, { foreignKey: 'item_id' });
SupplierBill.hasMany(SupplierBillItem, { foreignKey: 'supplier_bill_id' });

MessFeesAllot.belongsTo(User, { foreignKey: 'student_id', as: 'MessFeesAllotStudent' });
User.hasMany(MessFeesAllot, { foreignKey: 'student_id', as: 'MessFeesAllots' });

OtherExpense.belongsTo(Hostel, { foreignKey: 'hostel_id' });
OtherExpense.belongsTo(ExpenseType, { foreignKey: 'expense_type_id' });
OtherExpense.belongsTo(User, { foreignKey: 'approved_by', as: 'ExpenseApprovedBy' });

// Guest associations
Guest.belongsTo(Hostel, { foreignKey: 'hostel_id' });
Guest.belongsTo(User, { foreignKey: 'visiting_student_id', as: 'VisitingStudent' });
Hostel.hasMany(Guest, { foreignKey: 'hostel_id' });

// Menu and MenuItem associations
Menu.hasMany(MenuItem, { foreignKey: 'menu_id', as: 'tbl_Menu_Items' });
MenuItem.belongsTo(Menu, { foreignKey: 'menu_id' });
MenuItem.belongsTo(Item, { foreignKey: 'item_id', as: 'tbl_Item' });
Item.hasMany(MenuItem, { foreignKey: 'item_id' });

// Item and Category associations
Item.belongsTo(ItemCategory, { foreignKey: 'category_id', as: 'tbl_ItemCategory' });
ItemCategory.hasMany(Item, { foreignKey: 'category_id', as:"Items"});

Item.belongsTo(UOM, { foreignKey: 'unit_id', as: 'UOM' });
UOM.hasMany(Item, { foreignKey: 'unit_id' });

Groceries.belongsTo(UOM, { foreignKey: 'unit_id', as: 'UOM' });
UOM.hasMany(Groceries, { foreignKey: 'unit_id' });

// ... associations
InventoryBatch.belongsTo(Item, { foreignKey: 'item_id' });
Item.hasMany(InventoryBatch, { foreignKey: 'item_id' });
InventoryBatch.belongsTo(Hostel, { foreignKey: 'hostel_id' });

DailyConsumption.hasMany(ConsumptionLog, { foreignKey: 'daily_consumption_id', as: 'ConsumptionLogs' });
ConsumptionLog.belongsTo(DailyConsumption, { foreignKey: 'daily_consumption_id', as: 'DailyConsumption' });

DailyConsumption.belongsTo(Item, { foreignKey: 'item_id', as: 'tbl_Item' });
Item.hasMany(DailyConsumption, { foreignKey: 'item_id', as: 'DailyConsumption' });

// Existing associations (unchanged except where noted)
Hostel.hasMany(InventoryBatch, { foreignKey: 'hostel_id', as: 'InventoryBatches' });

ConsumptionLog.belongsTo(InventoryBatch, { foreignKey: 'batch_id', as: 'Batch' });
InventoryBatch.hasMany(ConsumptionLog, { foreignKey: 'batch_id', as: 'ConsumptionLogs' });

DailyConsumption.belongsTo(Item, { foreignKey: 'item_id'});
DailyConsumption.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy' });
DailyConsumption.belongsTo(UOM, { foreignKey: 'unit', as: 'UOM' });

// Ensure ItemStock is linked
ItemStock.belongsTo(Item, { foreignKey: 'item_id'});
ItemStock.belongsTo(Hostel, { foreignKey: 'hostel_id'});


// Add associations for MessDailyExpense
MessDailyExpense.belongsTo(Hostel, { foreignKey: 'hostel_id' });
MessDailyExpense.belongsTo(ExpenseType, { foreignKey: 'expense_type_id', as: 'ExpenseType' });
MessDailyExpense.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy' });


StudentFee.belongsTo(User, { foreignKey: 'student_id', as: 'Student' });
StudentFee.belongsTo(User, { foreignKey: 'issued_by', as: 'IssuedBy' });
StudentFee.belongsTo(Hostel, { foreignKey: 'hostel_id' });
User.hasMany(StudentFee, { foreignKey: 'student_id', as: 'StudentFees' });


module.exports = {
  sequelize,
  User,
  Hostel,
  RoomType,
  HostelRoom,
  Session,
  Enrollment,
  RoomAllotment,
  Menu,
  ItemCategory,
  UOM,
  Item,
  MessBill,
  // Facility Management
  HostelFacilityType,
  HostelFacility,
  HostelFacilityRegister,
  HostelMaintenance,
  // Finance Management
  IncomeType,
  ExpenseType,
  // Warden Workflow
  Suspension,
  Attendance,
  Holiday,
  Fee,
  AdditionalCollectionType,
  AdditionalCollection,
  AdditionalIncome,
  Rebate,
  Complaint,
  // Student Workflow
  Leave,
  Transaction,
  // Mess Workflow
  MenuItem,
  MenuSchedule,
  Token,
  Groceries,
  GroceriesType,
  ItemStock,
  DailyConsumption,
  DailyConsumptionReturn,
  NonConsumables,
  OtherItems,
  Supplier,
  PurchaseOrder,
  PurchaseOrderItem,
  SupplierBill,
  SupplierBillItem,
  MessFeesAllot,
  OtherExpense,
  // Guest Management
  DailyMessCharge,
  Guest,
  MessCharge,
  Store,
  ItemStore,
  InventoryTransaction,
  
  SpecialFoodItem,
  FoodOrder,
  FoodOrderItem,

  InventoryBatch,
  ConsumptionLog,

  MessDailyExpense,
  SpecialConsumption,
  SpecialConsumptionItem,
  StudentFee,
  CreditToken,
  Concern
};
