import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

// ==========================================
// 1. IDENTITY & STAFF MODELS
// ==========================================

export const Role = sequelize.define('Role', {
  roleId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  roleName: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'roles', timestamps: true });

export const Department = sequelize.define('Department', {
  departmentId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  departmentName: { type: DataTypes.STRING(100), allowNull: false },
  departmentAcr: { type: DataTypes.STRING(10), allowNull: false },
  status: { type: DataTypes.ENUM('Active', 'Inactive', 'Archived'), defaultValue: 'Active' },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'departments', timestamps: true });

export const User = sequelize.define('User', {
  userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userName: { type: DataTypes.STRING(255), allowNull: false },
  userMail: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
  password: { type: DataTypes.STRING(255), allowNull: false },
  roleId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'roles', key: 'roleId' } },
  departmentId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'departments', key: 'departmentId' } },
  // Hostel Fields
  roll_number: { type: DataTypes.STRING(50), allowNull: true, unique: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_Hostel', key: 'id' } },
  // Auth Fields
  status: { type: DataTypes.ENUM('Active', 'Inactive'), defaultValue: 'Active' },
  google_id: { type: DataTypes.STRING(255), allowNull: true, unique: true },
  authProvider: { type: DataTypes.ENUM('local', 'google'), defaultValue: 'local' },
  profile_picture: { type: DataTypes.STRING(500), defaultValue: '/uploads/default.jpg' },
  resetOTP: { type: DataTypes.STRING(255), allowNull: true },
  resetOTPExpires: { type: DataTypes.DATE, allowNull: true },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  updatedBy: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'users', timestamps: true });

// ==========================================
// 2. HOSTEL CORE MODELS
// ==========================================

export const Hostel = sequelize.define('Hostel', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  contact_number: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true, validate: { isEmail: true } },
  capacity: { type: DataTypes.INTEGER, allowNull: false },
  annual_fee_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 },
  show_fee_reminder: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_Hostel', timestamps: true });

export const Session = sequelize.define('Session', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_Session', timestamps: true });

export const Enrollment = sequelize.define('Enrollment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  roll_number: { type: DataTypes.STRING, allowNull: true, unique: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  session_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Session', key: 'id' } },
  enrollment_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  requires_bed: { type: DataTypes.BOOLEAN, defaultValue: false },
  college: { type: DataTypes.ENUM('nec', 'lapc'), allowNull: true },
  remaining_dues: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive', 'suspended'), defaultValue: 'active' }
}, { tableName: 'tbl_Enrollment', timestamps: true });

// ==========================================
// 3. ROOM MANAGEMENT
// ==========================================

export const RoomType = sequelize.define('RoomType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: false },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  description: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_RoomType', timestamps: true });

export const HostelRoom = sequelize.define('HostelRoom', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  layout_slot: { type: DataTypes.STRING, allowNull: true, comment: 'Grid slot (floorIdx-rowIdx-colIdx) used by layout builder' },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  room_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_RoomType', key: 'id' } },
  room_number: { type: DataTypes.STRING, allowNull: false },
  floor: { type: DataTypes.INTEGER, allowNull: true },
  occupancy_count: { type: DataTypes.INTEGER, defaultValue: 0, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_occupied: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'tbl_HostelRoom', timestamps: true });

export const RoomAllotment = sequelize.define('RoomAllotment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  room_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_HostelRoom', key: 'id' } },
  allotment_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  vacation_date: { type: DataTypes.DATE, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  remaining_dues: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'tbl_RoomAllotment', timestamps: true });

export const RoomRequest = sequelize.define('RoomRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  room_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_HostelRoom', key: 'id' } },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'), allowNull: false, defaultValue: 'pending' },
  requested_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  processed_at: { type: DataTypes.DATE, allowNull: true },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } },
  remarks: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_RoomRequest', timestamps: true });

export const HostelLayout = sequelize.define('HostelLayout', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  building_type: { type: DataTypes.ENUM('single', 'l', 'u', 'square'), allowNull: false },
  entrance_side: { type: DataTypes.ENUM('t', 'b', 'l', 'r'), allowNull: false },
  floors: { type: DataTypes.INTEGER, allowNull: false },
  top_rooms: { type: DataTypes.INTEGER, allowNull: true },
  bottom_rooms: { type: DataTypes.INTEGER, allowNull: true },
  left_rooms: { type: DataTypes.INTEGER, allowNull: true },
  right_rooms: { type: DataTypes.INTEGER, allowNull: true },
  orientation: { type: DataTypes.STRING, allowNull: true },
  open_side: { type: DataTypes.STRING, allowNull: true },
  layout_json: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_HostelLayout', timestamps: true });

// ==========================================
// 4. ATTENDANCE & WORKFLOW
// ==========================================

export const Attendance = sequelize.define('Attendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  status: { type: DataTypes.ENUM('P', 'A', 'OD'), allowNull: false },
  from_date: { type: DataTypes.DATEONLY, allowNull: true },
  to_date: { type: DataTypes.DATEONLY, allowNull: true },
  reason: { type: DataTypes.ENUM('NCC', 'NSS', 'Internship', 'Other'), allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true },
  marked_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  totalManDays: { type: DataTypes.INTEGER, allowNull: true },
  is_monthly: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'tbl_Attendance', timestamps: true });

export const GPSAttendance = sequelize.define('GPSAttendance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  attendance_date: { type: DataTypes.DATEONLY, allowNull: false },
  session: { type: DataTypes.ENUM('MORNING', 'EVENING', 'NIGHT'), allowNull: false },
  latitude: { type: DataTypes.DOUBLE, allowNull: false },
  longitude: { type: DataTypes.DOUBLE, allowNull: false },
  distance: { type: DataTypes.DOUBLE, allowNull: false },
  status: { type: DataTypes.ENUM('P', 'A'), defaultValue: 'P' },
  device_id: { type: DataTypes.STRING, allowNull: false },
  marked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
  tableName: 'tbl_GPS_Attendance',
  timestamps: true,
  indexes: [{ unique: true, fields: ['user_id', 'attendance_date', 'session'] }]
});

export const Leave = sequelize.define('Leave', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  leave_type: { type: DataTypes.ENUM('casual', 'sick', 'emergency', 'vacation', 'other'), allowNull: false },
  from_date: { type: DataTypes.DATE, allowNull: false },
  to_date: { type: DataTypes.DATE, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } },
  approved_date: { type: DataTypes.DATE, allowNull: true },
  remarks: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_Leaves', timestamps: true });

export const Suspension = sequelize.define('Suspension', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  reason: { type: DataTypes.TEXT, allowNull: false },
  start_date: { type: DataTypes.DATE, allowNull: false },
  end_date: { type: DataTypes.DATE, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'completed', 'cancelled'), defaultValue: 'active' },
  issued_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  remarks: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_Suspension', timestamps: true });

export const DayReductionRequest = sequelize.define('DayReductionRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  from_date: { type: DataTypes.DATEONLY, allowNull: false },
  to_date: { type: DataTypes.DATEONLY, allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('pending_admin', 'approved_by_admin', 'rejected_by_admin', 'approved_by_warden', 'rejected_by_warden'), defaultValue: 'pending_admin', allowNull: false },
  admin_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } },
  admin_remarks: { type: DataTypes.TEXT, allowNull: true },
  warden_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } },
  warden_remarks: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_DayReductionRequests', timestamps: true });

export const Holiday = sequelize.define('Holiday', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  type: { type: DataTypes.ENUM('national', 'religious', 'institutional', 'other'), defaultValue: 'other' },
  description: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_Holiday', timestamps: true });

export const Complaint = sequelize.define('Complaint', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  subject: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  category: { type: DataTypes.ENUM('room', 'mess', 'facility', 'maintenance', 'discipline', 'other'), allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('submitted', 'in_progress', 'resolved', 'closed'), defaultValue: 'submitted' },
  assigned_to: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } },
  resolution: { type: DataTypes.TEXT, allowNull: true },
  resolved_date: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'tbl_Complaint', timestamps: true });

// ==========================================
// 5. INVENTORY & ITEM MANAGEMENT
// ==========================================

export const ItemCategory = sequelize.define('ItemCategory', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_ItemCategory', timestamps: true });

export const UOM = sequelize.define('UOM', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  abbreviation: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('weight', 'volume', 'length', 'count', 'other'), allowNull: false }
}, { tableName: 'tbl_UOM', timestamps: true });

export const Item = sequelize.define('Item', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_ItemCategory', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  maximum_quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'Target stock maintained after procurement' },
  unit_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_UOM', key: 'id' } }
}, { tableName: 'tbl_Item', timestamps: true });

export const ItemStock = sequelize.define('ItemStock', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  current_stock: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00, comment: 'Total stock across all batches for this item and hostel' },
  minimum_stock: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00, comment: 'Minimum stock threshold for reordering' },
  last_updated: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW, comment: 'Last time stock was updated' },
  last_purchase_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Date of the most recent batch purchase' }
}, {
  tableName: 'tbl_ItemStock',
  timestamps: true,
  indexes: [{ fields: ['item_id', 'hostel_id'] }]
});

export const InventoryBatch = sequelize.define('InventoryBatch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  quantity_purchased: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Original quantity purchased in this batch' },
  quantity_remaining: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00, comment: 'Current quantity left in this batch' },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Purchase price per unit for this batch' },
  purchase_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Date the batch was purchased' },
  expiry_date: { type: DataTypes.DATEONLY, allowNull: true, comment: 'Optional expiry date for perishable items' },
  status: { type: DataTypes.ENUM('active', 'depleted', 'expired'), allowNull: false, defaultValue: 'active', comment: 'Batch status for FIFO management' }
}, {
  tableName: 'tbl_InventoryBatch',
  timestamps: true,
  indexes: [
    { fields: ['item_id', 'hostel_id', 'purchase_date'] },
    { fields: ['status'] }
  ]
});

export const Store = sequelize.define('Store', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.TEXT, allowNull: true },
  contact_number: { type: DataTypes.STRING, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_Store', timestamps: true });

export const ItemStore = sequelize.define('ItemStore', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  store_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Store', key: 'id' } },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  is_preferred: { type: DataTypes.BOOLEAN, defaultValue: false },
  last_purchased_date: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'tbl_ItemStore', timestamps: true });

export const InventoryTransaction = sequelize.define('InventoryTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  store_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_Store', key: 'id' } },
  transaction_date: { type: DataTypes.DATEONLY, allowNull: false, comment: 'Date when the inventory transaction occurred' },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit: { type: DataTypes.STRING, allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  transaction_type: { type: DataTypes.ENUM('purchase', 'consumption'), allowNull: false },
  notes: { type: DataTypes.TEXT, allowNull: true },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } }
}, { tableName: 'tbl_InventoryTransaction', timestamps: true });

export const RestockPlan = sequelize.define('RestockPlan', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false },
  item_id: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.TINYINT, allowNull: false },
  year: { type: DataTypes.SMALLINT, allowNull: false },
  quantity_needed: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  last_consumed_at: { type: DataTypes.DATEONLY, allowNull: false },
  is_cleared: { type: DataTypes.BOOLEAN, defaultValue: false },
  cleared_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'tbl_RestockPlan', timestamps: true });

// ==========================================
// 6. MESS & CONSUMPTION
// ==========================================

export const Menu = sequelize.define('Menu', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  meal_type: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'), allowNull: false },
  date: { type: DataTypes.DATE, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  estimated_servings: { type: DataTypes.INTEGER, allowNull: true },
  preparation_time: { type: DataTypes.INTEGER, allowNull: true, comment: 'Preparation time in minutes' }
}, { tableName: 'tbl_Menu', timestamps: true });

export const MenuItem = sequelize.define('MenuItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  menu_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Menu', key: 'id' } },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  quantity: { type: DataTypes.DECIMAL(8, 2), allowNull: false },
  unit_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_UOM', key: 'id' }, comment: 'Unit of measurement (linked to UOM)' },
  preparation_notes: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_Menu_Item', timestamps: true });

export const MenuSchedule = sequelize.define('MenuSchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  menu_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Menu', key: 'id' } },
  scheduled_date: { type: DataTypes.DATEONLY, allowNull: false },
  meal_time: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'), allowNull: false },
  status: { type: DataTypes.ENUM('scheduled', 'served', 'cancelled'), defaultValue: 'scheduled' },
  estimated_servings: { type: DataTypes.INTEGER, allowNull: true, comment: 'Estimated number of servings planned' },
  total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'Total calculated cost for all ingredients' },
  cost_per_serving: { type: DataTypes.DECIMAL(10, 2), allowNull: true, comment: 'Calculated cost per individual serving' }
}, { tableName: 'tbl_MenuSchedule', timestamps: true });

export const Recipe = sequelize.define('Recipe', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false, comment: 'Name of the dish (e.g., Sambar, Dosa)' },
  description: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_Recipe', timestamps: true });

export const RecipeItem = sequelize.define('RecipeItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipe_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Recipe', key: 'id' } },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  quantity_per_serving: { type: DataTypes.DECIMAL(10, 4), allowNull: false, comment: 'Quantity required for ONE person' },
  unit_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_UOM', key: 'id' } }
}, { tableName: 'tbl_RecipeItem', timestamps: false });

export const DailyConsumption = sequelize.define('DailyConsumption', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  consumption_date: { type: DataTypes.DATEONLY, allowNull: false },
  quantity_consumed: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Total quantity consumed for this item on this date' },
  unit: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_UOM', key: 'id' }, comment: 'Unit of measurement (linked to UOM)' },
  meal_type: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'), allowNull: false },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00, comment: 'Total cost of consumption based on FIFO batches' }
}, {
  tableName: 'tbl_DailyConsumption',
  timestamps: true,
  indexes: [{ fields: ['item_id', 'hostel_id', 'consumption_date'] }]
});

export const ConsumptionLog = sequelize.define('ConsumptionLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  daily_consumption_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_DailyConsumption', key: 'id' } },
  batch_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_InventoryBatch', key: 'id' } },
  quantity_consumed: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Quantity consumed from this batch' },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Cost of consumed quantity (quantity * batch unit_price)' },
  meal_type: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'), allowNull: false, comment: 'Meal type for which this consumption was recorded' }
}, {
  tableName: 'tbl_ConsumptionLog',
  timestamps: true,
  indexes: [
    { fields: ['daily_consumption_id'] },
    { fields: ['batch_id'] }
  ]
});

export const DailyConsumptionReturn = sequelize.define('DailyConsumptionReturn', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  daily_consumption_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_DailyConsumption', key: 'id' } },
  returned_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  quantity_returned: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  return_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  reason: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_DailyConsumptionReturn', timestamps: true });

export const SpecialConsumption = sequelize.define('SpecialConsumption', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false, comment: 'Descriptive name for the consumption event, e.g., "Annual Day Celebration"' },
  description: { type: DataTypes.TEXT, allowNull: true },
  consumption_date: { type: DataTypes.DATEONLY, allowNull: false },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  total_cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00, comment: 'Total calculated cost of all items consumed in this event' }
}, { tableName: 'tbl_SpecialConsumption', timestamps: true });

export const SpecialConsumptionItem = sequelize.define('SpecialConsumptionItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  special_consumption_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_SpecialConsumption', key: 'id' } },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  daily_consumption_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_DailyConsumption', key: 'id' }, comment: 'Links to the underlying consumption record which handled stock deduction' },
  quantity_consumed: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_UOM', key: 'id' } },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: false, comment: 'Cost of this specific item line, calculated via FIFO' }
}, { tableName: 'tbl_SpecialConsumptionItem', timestamps: false });

export const Token = sequelize.define('Token', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  token_date: { type: DataTypes.DATEONLY, allowNull: false },
  meal_type: { type: DataTypes.ENUM('breakfast', 'lunch', 'dinner', 'snacks'), allowNull: false },
  status: { type: DataTypes.ENUM('active', 'used', 'expired'), defaultValue: 'active' },
  used_at: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'tbl_Token', timestamps: true });

export const DailyMessCharge = sequelize.define('DailyMessCharge', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
  attendance_status: { type: DataTypes.ENUM('present', 'absent', 'on_duty', 'not_marked'), allowNull: false },
  is_charged: { type: DataTypes.BOOLEAN, allowNull: false }
}, {
  tableName: 'tbl_DailyMessCharge',
  timestamps: true,
  indexes: [{ unique: true, fields: ['student_id', 'date'] }]
});

export const MessBill = sequelize.define('MessBill', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'paid', 'overdue'), defaultValue: 'pending' },
  due_date: { type: DataTypes.DATE, allowNull: false }
}, { tableName: 'tbl_MessBill', timestamps: true });

// ==========================================
// 7. FINANCE & BILLING
// ==========================================

export const IncomeType = sequelize.define('IncomeType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_IncomeType', timestamps: true });

export const ExpenseType = sequelize.define('ExpenseType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_ExpenseType', timestamps: true });

export const Fee = sequelize.define('Fee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  enrollment_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_Enrollment', key: 'id' }, comment: 'Links fee to a specific enrollment period' },
  fee_type: { type: DataTypes.ENUM('hostel', 'mess', 'maintenance', 'security', 'emi', 'other'), allowNull: false, comment: 'Type of fee - added "emi" option for bed allocation EMI payments' },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  due_date: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'paid', 'overdue', 'waived'), defaultValue: 'pending' },
  payment_date: { type: DataTypes.DATE, allowNull: true },
  payment_method: { type: DataTypes.ENUM('cash', 'card', 'upi', 'bank_transfer', 'other'), allowNull: true, comment: 'Method used for payment, if paid' },
  transaction_id: { type: DataTypes.STRING, allowNull: true, comment: 'Reference ID for the payment transaction' },
  receipt_number: { type: DataTypes.STRING, allowNull: true, comment: 'Receipt number for the payment' },
  emi_month: { type: DataTypes.INTEGER, allowNull: true, comment: 'For EMI payments, tracks which month in the sequence (1-5)' },
  collected_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' }, comment: 'User who collected the payment' },
  remarks: { type: DataTypes.TEXT, allowNull: true, comment: 'Any additional notes about this fee or payment' }
}, {
  tableName: 'tbl_Fee',
  timestamps: true,
  indexes: [
    { fields: ['student_id'] },
    { fields: ['enrollment_id'] },
    { fields: ['fee_type'] },
    { fields: ['status'] },
    { fields: ['due_date'] }
  ]
});

export const StudentFee = sequelize.define('StudentFee', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  fee_type: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  month: { type: DataTypes.INTEGER, allowNull: false, comment: 'Month this fee applies to (1-12)' },
  year: { type: DataTypes.INTEGER, allowNull: false, comment: 'Year this fee applies to' },
  status: { type: DataTypes.ENUM('pending', 'paid'), defaultValue: 'pending' },
  issued_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  issue_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'tbl_StudentFee', timestamps: true });

export const DailyRateLog = sequelize.define('DailyRateLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false },
  month: { type: DataTypes.INTEGER, allowNull: false },
  year: { type: DataTypes.INTEGER, allowNull: false },
  gross_expenses: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  total_deductions: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  total_man_days: { type: DataTypes.INTEGER, allowNull: false },
  daily_rate: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  saved_by: { type: DataTypes.INTEGER, allowNull: true }
}, {
  tableName: 'tbl_DailyRateLog',
  timestamps: true,
  indexes: [{ unique: true, fields: ['hostel_id', 'month', 'year'] }]
});

export const Concern = sequelize.define('Concern', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true, comment: 'The specific name, e.g., "K.R. Memorial Scholarship Meeting"' },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_Concern', timestamps: true });

export const CreditToken = sequelize.define('CreditToken', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  concern_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Concern', key: 'id' } },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } }
}, { tableName: 'tbl_CreditToken', timestamps: true });

export const AdditionalCollectionType = sequelize.define('AdditionalCollectionType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  default_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.00 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_AdditionalCollectionType', timestamps: true });

export const AdditionalCollection = sequelize.define('AdditionalCollection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  collection_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_AdditionalCollectionType', key: 'id' } },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: true },
  collected_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  collection_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  status: { type: DataTypes.ENUM('pending', 'collected', 'waived'), defaultValue: 'pending' }
}, { tableName: 'tbl_AdditionalCollection', timestamps: true });

export const AdditionalIncome = sequelize.define('AdditionalIncome', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  income_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_IncomeType', key: 'id' } },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  received_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  received_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } }
}, { tableName: 'tbl_AdditionalIncome', timestamps: true });

export const Rebate = sequelize.define('Rebate', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  rebate_type: { type: DataTypes.ENUM('mess', 'hostel', 'facility', 'other'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  reason: { type: DataTypes.TEXT, allowNull: false },
  from_date: { type: DataTypes.DATE, allowNull: false },
  to_date: { type: DataTypes.DATE, allowNull: false },
  approved_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } },
  status: { type: DataTypes.ENUM('pending', 'approved', 'rejected'), defaultValue: 'pending' }
}, { tableName: 'tbl_Rebate', timestamps: true });

export const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  transaction_type: { type: DataTypes.ENUM('payment', 'refund', 'adjustment'), allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  payment_method: { type: DataTypes.ENUM('cash', 'card', 'online', 'upi', 'bank_transfer'), allowNull: false },
  reference_id: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'), defaultValue: 'pending' },
  processed_by: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } }
}, { tableName: 'tbl_Transaction', timestamps: true });

export const MessDailyExpense = sequelize.define('MessDailyExpense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  expense_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_ExpenseType', key: 'id' } },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  expense_date: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  description: { type: DataTypes.TEXT, allowNull: true },
  recorded_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } }
}, { tableName: 'tbl_MessDailyExpense', timestamps: true });

export const OtherExpense = sequelize.define('OtherExpense', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  expense_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_ExpenseType', key: 'id' } },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  expense_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  approved_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } }
}, { tableName: 'tbl_OtherExpense', timestamps: true });

// ==========================================
// 8. SUPPLIER & PURCHASE
// ==========================================

export const Supplier = sequelize.define('Supplier', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  contact_person: { type: DataTypes.STRING, allowNull: true },
  phone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  supplier_type: { type: DataTypes.ENUM('groceries', 'vegetables', 'dairy', 'meat', 'other'), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_Supplier', timestamps: true });

export const PurchaseOrder = sequelize.define('PurchaseOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Supplier', key: 'id' } },
  order_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  expected_delivery: { type: DataTypes.DATE, allowNull: true },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0.00 },
  status: { type: DataTypes.ENUM('draft', 'sent', 'confirmed', 'delivered', 'cancelled'), defaultValue: 'draft' },
  created_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } }
}, { tableName: 'tbl_PurchaseOrder', timestamps: true });

export const PurchaseOrderItem = sequelize.define('PurchaseOrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  purchase_order_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_PurchaseOrder', key: 'id' } },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, { tableName: 'tbl_PurchaseOrderItem', timestamps: true });

export const SupplierBill = sequelize.define('SupplierBill', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  supplier_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Supplier', key: 'id' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  purchase_order_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_PurchaseOrder', key: 'id' } },
  bill_number: { type: DataTypes.STRING, allowNull: false },
  bill_date: { type: DataTypes.DATE, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  due_date: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'paid', 'overdue', 'cancelled'), defaultValue: 'pending' },
  payment_date: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'tbl_SupplierBill', timestamps: true });

export const SupplierBillItem = sequelize.define('SupplierBillItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  supplier_bill_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_SupplierBill', key: 'id' } },
  item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Item', key: 'id' } },
  quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, { tableName: 'tbl_SupplierBillItem', timestamps: true });

// ==========================================
// 9. FACILITY MANAGEMENT
// ==========================================

export const HostelFacilityType = sequelize.define('HostelFacilityType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'tbl_HostelFacilityType', timestamps: true });

export const HostelFacility = sequelize.define('HostelFacility', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  facility_type_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_HostelFacilityType', key: 'id' } },
  name: { type: DataTypes.STRING, allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: true },
  status: { type: DataTypes.ENUM('active', 'inactive', 'maintenance'), defaultValue: 'active' },
  cost_per_use: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.00 }
}, { tableName: 'tbl_HostelFacility', timestamps: true });

export const HostelFacilityRegister = sequelize.define('HostelFacilityRegister', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  facility_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_HostelFacility', key: 'id' } },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  usage_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.00 },
  remarks: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_HostelFacilityRegister', timestamps: true });

export const HostelMaintenance = sequelize.define('HostelMaintenance', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  room_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_HostelRoom', key: 'id' } },
  facility_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'tbl_HostelFacility', key: 'id' } },
  issue_type: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  priority: { type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'), defaultValue: 'medium' },
  status: { type: DataTypes.ENUM('reported', 'in_progress', 'completed', 'cancelled'), defaultValue: 'reported' },
  reported_by: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  assigned_to: { type: DataTypes.STRING, allowNull: true },
  cost: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.00 },
  completion_date: { type: DataTypes.DATE, allowNull: true }
}, { tableName: 'tbl_HostelMaintenance', timestamps: true });

// ==========================================
// 10. SPECIAL FOOD & GUESTS
// ==========================================

export const SpecialFoodItem = sequelize.define('SpecialFoodItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  preparation_time_minutes: { type: DataTypes.INTEGER, allowNull: true },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
  category: { type: DataTypes.STRING, allowNull: false },
  image_url: { type: DataTypes.STRING, allowNull: true },
  expiry_time: { type: DataTypes.DATE, allowNull: true, comment: 'Optional expiry time for ordering deadline' }
}, { tableName: 'tbl_SpecialFoodItem', timestamps: true });

export const FoodOrder = sequelize.define('FoodOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  student_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'users', key: 'userId' } },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  order_date: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  requested_time: { type: DataTypes.DATE, allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'), defaultValue: 'pending' },
  payment_status: { type: DataTypes.ENUM('pending', 'paid', 'refunded'), defaultValue: 'pending' },
  notes: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_FoodOrder', timestamps: true });

export const FoodOrderItem = sequelize.define('FoodOrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  food_order_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_FoodOrder', key: 'id' } },
  food_item_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_SpecialFoodItem', key: 'id' } },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  special_instructions: { type: DataTypes.TEXT, allowNull: true }
}, { tableName: 'tbl_FoodOrderItem', timestamps: true });

export const Guest = sequelize.define('Guest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: true },
  email: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.TEXT, allowNull: true },
  hostel_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'tbl_Hostel', key: 'id' } },
  visiting_student_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'users', key: 'userId' } },
  check_in_date: { type: DataTypes.DATE, allowNull: false },
  check_out_date: { type: DataTypes.DATE, allowNull: true },
  room_assigned: { type: DataTypes.STRING, allowNull: true },
  purpose: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.ENUM('checked_in', 'checked_out', 'cancelled'), defaultValue: 'checked_in' },
  charges: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0.00 }
}, { tableName: 'tbl_Guest', timestamps: true });

// ==========================================
// UNIFIED ASSOCIATIONS
// ==========================================

export const initAssociations = () => {
  // ==========================================
  // 1. IDENTITY & STAFF MANAGEMENT MODULE
  // ==========================================
  User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
  Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });

  User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });
  Department.hasMany(User, { foreignKey: 'departmentId', as: 'users' });

  // ==========================================
  // 2. HOSTEL & ROOM INFRASTRUCTURE
  // ==========================================
  User.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Hostel.hasMany(User, { foreignKey: 'hostel_id' });

  HostelRoom.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Hostel.hasMany(HostelRoom, { foreignKey: 'hostel_id' });

  HostelRoom.belongsTo(RoomType, { foreignKey: 'room_type_id' });
  RoomType.hasMany(HostelRoom, { foreignKey: 'room_type_id' });

  RoomType.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Hostel.hasMany(RoomType, { foreignKey: 'hostel_id' });

  HostelLayout.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Hostel.hasOne(HostelLayout, { foreignKey: 'hostel_id' });

  // ==========================================
  // 3. STUDENT FLOW (ENROLLMENT & ALLOTMENT)
  // ==========================================
  Enrollment.belongsTo(User, { foreignKey: 'student_id', as: 'EnrollmentStudent', targetKey: 'userId' });
  User.hasMany(Enrollment, { foreignKey: 'student_id', as: 'tbl_Enrollment' });
  Enrollment.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Enrollment.belongsTo(Session, { foreignKey: 'session_id' });

  RoomAllotment.belongsTo(User, { foreignKey: 'student_id', as: 'AllotmentStudent', targetKey: 'userId' });
  User.hasMany(RoomAllotment, { foreignKey: 'student_id', as: 'tbl_RoomAllotments' });
  RoomAllotment.belongsTo(HostelRoom, { foreignKey: 'room_id' });
  HostelRoom.hasMany(RoomAllotment, { foreignKey: 'room_id', as: 'tbl_RoomAllotments' });

  RoomRequest.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  RoomRequest.belongsTo(User, { foreignKey: 'approved_by', as: 'ProcessedBy', targetKey: 'userId' });
  RoomRequest.belongsTo(HostelRoom, { foreignKey: 'room_id', as: 'Room' });
  RoomRequest.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  User.hasMany(RoomRequest, { foreignKey: 'student_id', as: 'RoomRequests' });
  HostelRoom.hasMany(RoomRequest, { foreignKey: 'room_id', as: 'RoomRequests' });
  Hostel.hasMany(RoomRequest, { foreignKey: 'hostel_id', as: 'RoomRequests' });

  // ==========================================
  // 4. ATTENDANCE & WORKFLOW
  // ==========================================
  Attendance.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  Attendance.belongsTo(User, { foreignKey: 'marked_by', as: 'MarkedBy', targetKey: 'userId' });
  Attendance.belongsTo(Hostel, { foreignKey: 'hostel_id' });

  GPSAttendance.belongsTo(User, { foreignKey: 'user_id', targetKey: 'userId' });
  GPSAttendance.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  User.hasMany(GPSAttendance, { foreignKey: 'user_id' });
  Hostel.hasMany(GPSAttendance, { foreignKey: 'hostel_id' });

  Leave.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  Leave.belongsTo(User, { foreignKey: 'approved_by', as: 'ApprovedBy', targetKey: 'userId' });
  User.hasMany(Leave, { foreignKey: 'student_id', as: 'StudentLeaves' });
  User.hasMany(Leave, { foreignKey: 'approved_by', as: 'ApprovedLeaves' });

  Complaint.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  Complaint.belongsTo(User, { foreignKey: 'assigned_to', as: 'AssignedTo', targetKey: 'userId' });
  User.hasMany(Complaint, { foreignKey: 'student_id', as: 'StudentComplaints' });
  User.hasMany(Complaint, { foreignKey: 'assigned_to', as: 'AssignedComplaints' });

  Suspension.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  Suspension.belongsTo(User, { foreignKey: 'issued_by', as: 'IssuedBy', targetKey: 'userId' });

  DayReductionRequest.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  DayReductionRequest.belongsTo(User, { foreignKey: 'admin_id', as: 'AdminProcessor', targetKey: 'userId' });
  DayReductionRequest.belongsTo(User, { foreignKey: 'warden_id', as: 'WardenProcessor', targetKey: 'userId' });
  DayReductionRequest.belongsTo(Hostel, { foreignKey: 'hostel_id', as: 'Hostel' });

  Holiday.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Hostel.hasMany(Holiday, { foreignKey: 'hostel_id' });

  // ==========================================
  // 5. MESS & INVENTORY MODULE
  // ==========================================
  Item.belongsTo(ItemCategory, { foreignKey: 'category_id', as: 'tbl_ItemCategory' });
  ItemCategory.hasMany(Item, { foreignKey: 'category_id', as: 'Items' });
  Item.belongsTo(UOM, { foreignKey: 'unit_id', as: 'UOM' });
  UOM.hasMany(Item, { foreignKey: 'unit_id' });

  ItemStock.belongsTo(Item, { foreignKey: 'item_id' });
  ItemStock.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Item.hasMany(ItemStock, { foreignKey: 'item_id' });
  Hostel.hasMany(ItemStock, { foreignKey: 'hostel_id' });

  InventoryBatch.belongsTo(Item, { foreignKey: 'item_id' });
  InventoryBatch.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Item.hasMany(InventoryBatch, { foreignKey: 'item_id' });
  Hostel.hasMany(InventoryBatch, { foreignKey: 'hostel_id', as: 'InventoryBatches' });

  DailyConsumption.belongsTo(Item, { foreignKey: 'item_id', as: 'tbl_Item' });
  DailyConsumption.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  DailyConsumption.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy', targetKey: 'userId' });
  DailyConsumption.belongsTo(UOM, { foreignKey: 'unit', as: 'UOM' });
  Item.hasMany(DailyConsumption, { foreignKey: 'item_id', as: 'DailyConsumption' });

  DailyConsumption.hasMany(ConsumptionLog, { foreignKey: 'daily_consumption_id', as: 'ConsumptionLogs' });
  ConsumptionLog.belongsTo(DailyConsumption, { foreignKey: 'daily_consumption_id', as: 'DailyConsumption' });
  ConsumptionLog.belongsTo(InventoryBatch, { foreignKey: 'batch_id', as: 'Batch' });
  InventoryBatch.hasMany(ConsumptionLog, { foreignKey: 'batch_id', as: 'ConsumptionLogs' });

  DailyConsumptionReturn.belongsTo(DailyConsumption, { foreignKey: 'daily_consumption_id' });
  DailyConsumptionReturn.belongsTo(User, { foreignKey: 'returned_by', as: 'ConsumptionReturnedBy', targetKey: 'userId' });

  // Menu & Recipes
  Menu.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Menu.hasMany(MenuItem, { foreignKey: 'menu_id', as: 'tbl_Menu_Items' });
  MenuItem.belongsTo(Menu, { foreignKey: 'menu_id' });
  MenuItem.belongsTo(Item, { foreignKey: 'item_id', as: 'tbl_Item' });
  MenuItem.belongsTo(UOM, { foreignKey: 'unit_id', as: 'UOMDetail' });
  Item.hasMany(MenuItem, { foreignKey: 'item_id' });

  MenuSchedule.belongsTo(Menu, { foreignKey: 'menu_id' });
  MenuSchedule.belongsTo(Hostel, { foreignKey: 'hostel_id' });

  Recipe.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Recipe.hasMany(RecipeItem, { foreignKey: 'recipe_id', as: 'Ingredients' });
  RecipeItem.belongsTo(Recipe, { foreignKey: 'recipe_id' });
  RecipeItem.belongsTo(Item, { foreignKey: 'item_id', as: 'ItemDetail' });
  RecipeItem.belongsTo(UOM, { foreignKey: 'unit_id', as: 'UOMDetail' });

  // Special Consumption
  SpecialConsumption.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  SpecialConsumption.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy', targetKey: 'userId' });
  SpecialConsumption.hasMany(SpecialConsumptionItem, { foreignKey: 'special_consumption_id', as: 'ItemsConsumed' });
  SpecialConsumptionItem.belongsTo(SpecialConsumption, { foreignKey: 'special_consumption_id' });
  SpecialConsumptionItem.belongsTo(Item, { foreignKey: 'item_id' });
  SpecialConsumptionItem.belongsTo(UOM, { foreignKey: 'unit_id' });
  SpecialConsumptionItem.belongsTo(DailyConsumption, { foreignKey: 'daily_consumption_id' });

  // Purchase & Stores
  ItemStore.belongsTo(Item, { foreignKey: 'item_id' });
  ItemStore.belongsTo(Store, { foreignKey: 'store_id' });
  Store.hasMany(ItemStore, { foreignKey: 'store_id' });
  Item.hasMany(ItemStore, { foreignKey: 'item_id' });

  InventoryTransaction.belongsTo(Item, { foreignKey: 'item_id' });
  InventoryTransaction.belongsTo(Store, { foreignKey: 'store_id' });
  InventoryTransaction.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  InventoryTransaction.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy', targetKey: 'userId' });

  RestockPlan.belongsTo(Item, { foreignKey: 'item_id' });
  RestockPlan.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Item.hasMany(RestockPlan, { foreignKey: 'item_id' });

  // Token
  Token.belongsTo(User, { foreignKey: 'student_id', as: 'TokenStudent', targetKey: 'userId' });
  User.hasMany(Token, { foreignKey: 'student_id', as: 'Tokens' });

  // ==========================================
  // 6. FINANCE & BILLING MODULE
  // ==========================================

  // Basic Fees
  Fee.belongsTo(User, { foreignKey: 'student_id', as: 'FeeStudent', targetKey: 'userId' });
  Fee.belongsTo(User, { foreignKey: 'collected_by', as: 'CollectedBy', targetKey: 'userId' });
  Fee.belongsTo(Enrollment, { foreignKey: 'enrollment_id', as: 'Enrollment' });
  Enrollment.hasMany(Fee, { foreignKey: 'enrollment_id', as: 'Fees' });
  User.hasMany(Fee, { foreignKey: 'student_id', as: 'Fees' });

  // Monthly Student Fees
  StudentFee.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  StudentFee.belongsTo(User, { foreignKey: 'issued_by', as: 'IssuedBy', targetKey: 'userId' });
  StudentFee.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  User.hasMany(StudentFee, { foreignKey: 'student_id', as: 'StudentFees' });

  // Mess Bills
  MessBill.belongsTo(User, { foreignKey: 'student_id', as: 'MessBillStudent', targetKey: 'userId' });
  MessBill.belongsTo(Hostel, { foreignKey: 'hostel_id' });

  // Daily Mess Charges
  DailyMessCharge.belongsTo(User, { foreignKey: 'student_id', as: 'DailyMessChargeStudent', targetKey: 'userId' });
  DailyMessCharge.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  User.hasMany(DailyMessCharge, { foreignKey: 'student_id', as: 'DailyMessCharges' });

  // Daily Rate Log
  DailyRateLog.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  DailyRateLog.belongsTo(User, { foreignKey: 'saved_by', as: 'SavedBy', targetKey: 'userId' });

  // External Incomes
  AdditionalIncome.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  AdditionalIncome.belongsTo(IncomeType, { foreignKey: 'income_type_id', as: 'IncomeType' });
  AdditionalIncome.belongsTo(User, { foreignKey: 'received_by', as: 'IncomeReceivedBy', targetKey: 'userId' });

  CreditToken.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  CreditToken.belongsTo(Concern, { foreignKey: 'concern_id', as: 'Concern' });
  CreditToken.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy', targetKey: 'userId' });
  Concern.hasMany(CreditToken, { foreignKey: 'concern_id' });

  AdditionalCollection.belongsTo(User, { foreignKey: 'student_id', as: 'CollectionStudent', targetKey: 'userId' });
  AdditionalCollection.belongsTo(User, { foreignKey: 'collected_by', as: 'CollectedBy', targetKey: 'userId' });
  AdditionalCollection.belongsTo(AdditionalCollectionType, { foreignKey: 'collection_type_id' });

  // Expenses
  MessDailyExpense.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  MessDailyExpense.belongsTo(ExpenseType, { foreignKey: 'expense_type_id', as: 'ExpenseType' });
  MessDailyExpense.belongsTo(User, { foreignKey: 'recorded_by', as: 'RecordedBy', targetKey: 'userId' });

  OtherExpense.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  OtherExpense.belongsTo(ExpenseType, { foreignKey: 'expense_type_id' });
  OtherExpense.belongsTo(User, { foreignKey: 'approved_by', as: 'ExpenseApprovedBy', targetKey: 'userId' });

  // Rebates & Transactions
  Rebate.belongsTo(User, { foreignKey: 'student_id', as: 'RebateStudent', targetKey: 'userId' });
  Rebate.belongsTo(User, { foreignKey: 'approved_by', as: 'RebateApprovedBy', targetKey: 'userId' });

  Transaction.belongsTo(User, { foreignKey: 'student_id', as: 'TransactionStudent', targetKey: 'userId' });
  Transaction.belongsTo(User, { foreignKey: 'processed_by', as: 'ProcessedBy', targetKey: 'userId' });

  // ==========================================
  // 7. SUPPLIER & PURCHASE
  // ==========================================
  PurchaseOrder.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  PurchaseOrder.belongsTo(Supplier, { foreignKey: 'supplier_id' });
  PurchaseOrder.belongsTo(User, { foreignKey: 'created_by', as: 'PurchaseOrderCreatedBy', targetKey: 'userId' });
  PurchaseOrder.hasMany(PurchaseOrderItem, { foreignKey: 'purchase_order_id' });

  PurchaseOrderItem.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
  PurchaseOrderItem.belongsTo(Item, { foreignKey: 'item_id' });

  SupplierBill.belongsTo(Supplier, { foreignKey: 'supplier_id' });
  SupplierBill.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  SupplierBill.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id' });
  SupplierBill.hasMany(SupplierBillItem, { foreignKey: 'supplier_bill_id' });

  SupplierBillItem.belongsTo(SupplierBill, { foreignKey: 'supplier_bill_id' });
  SupplierBillItem.belongsTo(Item, { foreignKey: 'item_id' });

  // ==========================================
  // 8. FACILITY MANAGEMENT
  // ==========================================
  HostelFacility.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  HostelFacility.belongsTo(HostelFacilityType, { foreignKey: 'facility_type_id' });
  Hostel.hasMany(HostelFacility, { foreignKey: 'hostel_id' });
  HostelFacilityType.hasMany(HostelFacility, { foreignKey: 'facility_type_id' });

  HostelFacilityRegister.belongsTo(HostelFacility, { foreignKey: 'facility_id', as: 'facility' });
  HostelFacilityRegister.belongsTo(User, { foreignKey: 'student_id', as: 'FacilityRegisterStudent', targetKey: 'userId' });
  HostelFacility.hasMany(HostelFacilityRegister, { foreignKey: 'facility_id', as: 'facilityRegisters' });
  User.hasMany(HostelFacilityRegister, { foreignKey: 'student_id', as: 'FacilityRegisters' });

  HostelMaintenance.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  HostelMaintenance.belongsTo(HostelRoom, { foreignKey: 'room_id' });
  HostelMaintenance.belongsTo(HostelFacility, { foreignKey: 'facility_id' });
  HostelMaintenance.belongsTo(User, { foreignKey: 'reported_by', as: 'ReportedBy', targetKey: 'userId' });

  // ==========================================
  // 9. SPECIAL FOOD & GUESTS
  // ==========================================
  SpecialFoodItem.hasMany(FoodOrderItem, { foreignKey: 'food_item_id' });
  FoodOrderItem.belongsTo(SpecialFoodItem, { foreignKey: 'food_item_id' });

  FoodOrder.hasMany(FoodOrderItem, { foreignKey: 'food_order_id' });
  FoodOrderItem.belongsTo(FoodOrder, { foreignKey: 'food_order_id' });

  FoodOrder.belongsTo(User, { foreignKey: 'student_id', as: 'Student', targetKey: 'userId' });
  FoodOrder.belongsTo(Hostel, { foreignKey: 'hostel_id' });

  Guest.belongsTo(Hostel, { foreignKey: 'hostel_id' });
  Guest.belongsTo(User, { foreignKey: 'visiting_student_id', as: 'VisitingStudent', targetKey: 'userId' });
  Hostel.hasMany(Guest, { foreignKey: 'hostel_id' });
};

// Export sequelize instance
export { sequelize };