// src/services/api.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return Promise.reject(new Error('Unauthorized: Please log in again'));
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(`API Error: ${message}`));
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
};

// Admin API - Complete CRUD operations
export const adminAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/admin/dashboard-stats'),

  // Hostel Management - Complete CRUD
  createHostel: (data) => api.post('/admin/hostels', data),
  getHostels: (params) => api.get('/admin/hostels', { params }),
  getHostelById: (id) => api.get(`/admin/hostels/${id}`),
  updateHostel: (id, data) => api.put(`/admin/hostels/${id}`, data),
  deleteHostel: (id) => api.delete(`/admin/hostels/${id}`),

  // User Management - Complete CRUD
  createUser: (data) => api.post('/admin/users', data),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),

  // Room Type Management - Complete CRUD
  createRoomType: (data) => api.post('/admin/room-types', data),
  getRoomTypes: (params) => api.get('/admin/room-types', { params }),
  updateRoomType: (id, data) => api.put(`/admin/room-types/${id}`, data),
  deleteRoomType: (id) => api.delete(`/admin/room-types/${id}`),

  // Room Management - Complete CRUD
  createRoom: (data) => api.post('/admin/rooms', data),
  getRooms: (params) => api.get('/admin/rooms', { params }),
  updateRoom: (id, data) => api.put(`/admin/rooms/${id}`, data),
  deleteRoom: (id) => api.delete(`/admin/rooms/${id}`),

  // Session Management - Complete CRUD
  createSession: (data) => api.post('/admin/sessions', data),
  getSessions: (params) => api.get('/admin/sessions', { params }),
  updateSession: (id, data) => api.put(`/admin/sessions/${id}`, data),
  deleteSession: (id) => api.delete(`/admin/sessions/${id}`),

  // Facility Type Management - Complete CRUD
  createFacilityType: (data) => api.post('/admin/facility-types', data),
  getFacilityTypes: (params) => api.get('/admin/facility-types', { params }),
  updateFacilityType: (id, data) => api.put(`/admin/facility-types/${id}`, data),
  deleteFacilityType: (id) => api.delete(`/admin/facility-types/${id}`),

  // Facility Management - Complete CRUD
  createFacility: (data) => api.post('/admin/facilities', data),
  getFacilities: (params) => api.get('/admin/facilities', { params }),
  updateFacility: (id, data) => api.put(`/admin/facilities/${id}`, data),
  deleteFacility: (id) => api.delete(`/admin/facilities/${id}`),

  // Maintenance Management - Complete CRUD
  createMaintenance: (data) => api.post('/admin/maintenance', data),
  getMaintenance: (params) => api.get('/admin/maintenance', { params }),
  updateMaintenance: (id, data) => api.put(`/admin/maintenance/${id}`, data),
  deleteMaintenance: (id) => api.delete(`/admin/maintenance/${id}`),

  // Income Type Management - Complete CRUD
  createIncomeType: (data) => api.post('/admin/income-types', data),
  getIncomeTypes: (params) => api.get('/admin/income-types', { params }),
  updateIncomeType: (id, data) => api.put(`/admin/income-types/${id}`, data),
  deleteIncomeType: (id) => api.delete(`/admin/income-types/${id}`),

  // Expense Type Management - Complete CRUD (This is the canonical source now)
  createExpenseType: (data) => api.post('/admin/expense-types', data),
  getExpenseTypes: (params) => api.get('/admin/expense-types', { params }),
  updateExpenseType: (id, data) => api.put(`/admin/expense-types/${id}`, data),
  deleteExpenseType: (id) => api.delete(`/admin/expense-types/${id}`),

  // Supplier Management - Complete CRUD
  createSupplier: (data) => api.post('/admin/suppliers', data),
  getSuppliers: (params) => api.get('/admin/suppliers', { params }),
  getSupplierById: (id) => api.get(`/admin/suppliers/${id}`),
  updateSupplier: (id, data) => api.put(`/admin/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/admin/suppliers/${id}`),

  // UOM Management - Complete CRUD
  createUOM: (data) => api.post('/admin/uoms', data),
  getUOMs: (params) => api.get('/admin/uoms', { params }),
  updateUOM: (id, data) => api.put(`/admin/uoms/${id}`, data),
  deleteUOM: (id) => api.delete(`/admin/uoms/${id}`),
};

// Warden API - Updated with complete endpoints
export const wardenAPI = {
  // Dashboard
  getDashboardStats: () => api.get('/warden/dashboard-stats'),
  getSessions: () => api.get('/warden/sessions'),

  // Student Management
  enrollStudent: (data) => api.post('/warden/students', data),
  getStudents: (params) => api.get('/warden/students', { params }),

  // EMI and Fee Management
  getHostelSettings: () => api.get('/warden/hostel-settings'),
  createFeeRecord: (data) => api.post('/warden/fees', data),
  updateFeeStatus: (id, data) => api.put(`/warden/fees/${id}/status`, data),
  getStudentFees: (studentId, params) => api.get(`/warden/students/${studentId}/fees`, { params }),
  updateInitialEmiStatus: (enrollmentId, data) => api.put(`/warden/enrollments/${enrollmentId}/emi-status`, data),
  getStudentEmiStatus: (studentId) => api.get(`/warden/students/${studentId}/emi-status`),

  // Room Management
  getAvailableRooms: () => api.get('/warden/available-rooms'),
  allotRoom: (data) => api.post('/warden/room-allotment', data),

  // Attendance Management
  markAttendance: (data) => api.post('/warden/attendance', data),
  getAttendance: (params) => api.get('/warden/attendance', { params }),
  updateAttendance: (id, data) => api.put(`/warden/attendance/${id}`, data),

  // Leave Management - Complete
  getLeaveRequests: (params) => api.get('/warden/leave-requests', { params }),
  getPendingLeaves: () => api.get('/warden/leave-requests/pending'),
  approveLeave: (id, data) => api.put(`/warden/leave-requests/${id}/approve`, data),
  updateLeaveStatus: (id, data) => api.put(`/warden/leave-requests/${id}/status`, data),

  // Complaint Management - Complete
  getComplaints: (params) => api.get('/warden/complaints', { params }),
  getPendingComplaints: () => api.get('/warden/complaints/pending'),
  updateComplaint: (id, data) => api.put(`/warden/complaints/${id}`, data),
  updateComplaintStatus: (id, data) => api.put(`/warden/complaints/${id}/status`, data),

  // Suspension Management
  createSuspension: (data) => api.post('/warden/suspensions', data),
  getSuspensions: () => api.get('/warden/suspensions'),
  updateSuspension: (id, data) => api.put(`/warden/suspensions/${id}`, data),

  // Holiday Management
  createHoliday: (data) => api.post('/warden/holidays', data),
  getHolidays: () => api.get('/warden/holidays'),
  updateHoliday: (id, data) => api.put(`/warden/holidays/${id}`, data),
  deleteHoliday: (id) => api.delete(`/warden/holidays/${id}`),

  // Additional Collections
  createAdditionalCollection: (data) => api.post('/warden/additional-collections', data),
  getAdditionalCollections: () => api.get('/warden/additional-collections'),

  generateMessBills: (data) => api.post('/warden/mess-bills/generate', data),
  getMessBills: (params) => api.get('/warden/mess-bills', { params }),
  updateMessBillStatus: (id, data) => api.put(`/warden/mess-bills/${id}/status`, data),
};
export const studentAPI = {
  // Profile
  getProfile: () => api.get('/student/profile'),

  // Mess Management
  getMessBills: (params) => api.get('/student/mess-bills', { params }),

  // Fee Management
  getMyFees: (params) => api.get('/student/fees', { params }),

  // Leave Management
  applyLeave: (data) => api.post('/student/leave-requests', data),
  getMyLeaves: () => api.get('/student/leave-requests'),

  // Complaint Management
  createComplaint: (data) => api.post('/student/complaints', data),
  getMyComplaints: () => api.get('/student/complaints'),

  // Transaction History
  getTransactions: () => api.get('/student/transactions'),

  // Attendance
  getMyAttendance: (params) => api.get('/student/attendance', { params }),

  // Facility Usage
  getFacilities: () => api.get('/student/facilities'),
  useFacility: (data) => api.post('/student/facility-usage', data),
  getMyFacilityUsage: () => api.get('/student/facility-usage'),

   getSpecialFoodItems: (params) => api.get('/student/special-food-items', { params }),
  getSpecialFoodItemCategories: () => api.get('/student/special-food-item-categories'),
  createFoodOrder: (data) => api.post('/student/food-orders', data),
  getFoodOrders: (params) => api.get('/student/food-orders', { params }),
  getFoodOrderById: (id) => api.get(`/student/food-orders/${id}`),
  cancelFoodOrder: (id) => api.put(`/student/food-orders/${id}/cancel`),
  getMyDailyMessCharges: (params) => api.get('/student/daily-mess-charges', { params }),


  // Meal Tokens
  getMyTokens: () => api.get('/student/tokens'),
};
// Mess API - Complete with all CRUD operations
export const messAPI = {
  // Dashboard
  getMessDashboardStats: () => api.get('/mess/dashboard-stats'),

  // Menu Management - Complete CRUD
  // Expected data: { name, meal_type, description, estimated_servings, preparation_time, items: [{ item_id, quantity, unit, preparation_notes }] }
  createMenu: (data) => api.post('/mess/menus', data),
  getMenus: (params) => api.get('/mess/menus', { params }), // params: { meal_type, search }
  getMenuById: (id) => api.get(`/mess/menus/${id}`),
  updateMenu: (id, data) => api.put(`/mess/menus/${id}`, data), // Expected data: { name, meal_type, description, estimated_servings, preparation_time }
  deleteMenu: (id) => api.delete(`/mess/menus/${id}`),

  // Item Management - Complete CRUD
  // Expected data: { name, category_id, unit_price, unit_id, description }
  createItem: (data) => api.post('/mess/items', data),
  getItems: (params) => api.get('/mess/items', { params }), // params: { category_id, search }
  getItemById: (id) => api.get(`/mess/items/${id}`),
  updateItem: (id, data) => api.put(`/mess/items/${id}`, data), // Expected data: { name, category_id, unit_price, unit_id, description }
  deleteItem: (id) => api.delete(`/mess/items/${id}`),

  // Item Category Management - Complete CRUD
  // Expected data: { name, description }
  createItemCategory: (data) => api.post('/mess/item-categories', data),
  getItemCategories: (params) => api.get('/mess/item-categories', { params }), // params: { search }
  updateItemCategory: (id, data) => api.put(`/mess/item-categories/${id}`, data), // Expected data: { name, description }
  deleteItemCategory: (id) => api.delete(`/mess/item-categories/${id}`),

  // Menu Item Management - Complete CRUD
  // Expected data: { items: [{ item_id, quantity, unit, preparation_notes }] }
  addItemsToMenu: (menuId, data) => api.post(`/mess/menus/${menuId}/items`, data),
  getMenuWithItems: (menuId) => api.get(`/mess/menus/${menuId}/items`),
  updateMenuItems: (menuId, data) => api.put(`/mess/menus/${menuId}/items`, data), // Expected data: { items: [{ item_id, quantity, unit, preparation_notes }] }
  removeItemFromMenu: (menuId, itemId) => api.delete(`/mess/menus/${menuId}/items/${itemId}`),
  getItemBatches: (itemId) => api.get(`/mess/items/${itemId}/batches`),
  // Menu Scheduling - Complete CRUD
  // Expected data: { menu_id, scheduled_date, meal_time, estimated_servings }
  scheduleMenu: (data) => api.post('/mess/menu-schedule', data),
  getMenuSchedule: (params) => api.get('/mess/menu-schedule', { params }), // params: { start_date, end_date }
  updateMenuSchedule: (id, data) => api.put(`/mess/menu-schedule/${id}`, data), // Expected data: { menu_id, meal_time, estimated_servings, status }
  deleteMenuSchedule: (id) => api.delete(`/mess/menu-schedule/${id}`),
  // Note: Uses PUT to match backend route
  serveMenu: (id) => api.put(`/mess/menu-schedule/${id}/serve`),

  // UOM Management - Complete CRUD
  // Expected data: { name, abbreviation, type }
  createUOM: (data) => api.post('/mess/uoms', data),
  getUOMs: (params) => api.get('/mess/uoms', { params }), // params: { type }
  updateUOM: (id, data) => api.put(`/mess/uoms/${id}`, data), // Expected data: { name, abbreviation, type }
  deleteUOM: (id) => api.delete(`/mess/uoms/${id}`),

  // Stock Management
  // Expected data: { item_id, hostel_id, quantity, unit_price, purchase_date, expiry_date }
  updateItemStock: (data) => api.post('/mess/stock', data),
  getItemStock: (params) => api.get('/mess/stock', { params }), // params: { low_stock }
  // Expected data: { consumptions: [{ item_id, quantity_consumed, unit, consumption_date, meal_type }] }
  recordBulkConsumption: (data) => api.post('/mess/consumption/bulk', data),
  getDailyConsumption: (params) => api.get('/mess/consumption', { params }), // params: { date, meal_type, item_id }
  // Expected data: { items: [{ item_id, quantity, unit_price, transaction_date, expiry_date }] }
  recordInventoryPurchase: (data) => api.post('/mess/inventory-purchase', data),
  getInventoryTransactions: (params) => api.get('/mess/inventory-transactions', { params }), // params: { transaction_type, item_id, store_id, from_date, to_date }

  // Store Management - Complete CRUD
  // Expected data: { name, address, contact_number }
  createStore: (data) => api.post('/mess/stores', data),
  getStores: (params) => api.get('/mess/stores', { params }), // params: { search, is_active }
  updateStore: (id, data) => api.put(`/mess/stores/${id}`, data), // Expected data: { name, address, contact_number, is_active }
  deleteStore: (id) => api.delete(`/mess/stores/${id}`),


  // Item-Store Mapping - Complete CRUD
  // Expected data: { item_id, store_id, price, is_preferred }
  mapItemToStore: (data) => api.post('/mess/item-stores', data),
  getItemStores: (params) => api.get('/mess/item-stores', { params }), // params: { item_id }
  removeItemStoreMapping: (id) => api.delete(`/mess/item-stores/${id}`),
  getItemsByStoreId: (storeId) => api.get(`/mess/stores/${storeId}/items`),
  getStoresByItemId: (itemId) => api.get(`/mess/items/${itemId}/stores`),

  // Special Food Items - Complete CRUD

    getItemFIFOPrice: (itemId) => api.get(`/mess/items/${itemId}/fifo-price`),

  // Expected data: { name, description, price, preparation_time_minutes, category, image_url }
  createSpecialFoodItem: (data) => api.post('/mess/special-food-items', data),
  getSpecialFoodItems: (params) => api.get('/mess/special-food-items', { params }), // params: { category, is_available, search }
  getSpecialFoodItemById: (id) => api.get(`/mess/special-food-items/${id}`),
  updateSpecialFoodItem: (id, data) => api.put(`/mess/special-food-items/${id}`, data), // Expected data: { name, description, price, preparation_time_minutes, category, image_url, is_available }
  deleteSpecialFoodItem: (id) => api.delete(`/mess/special-food-items/${id}`),

  // Food Orders - Complete CRUD
  // Expected data: { items: [{ food_item_id, quantity, special_instructions }], requested_time, notes }
  // Note: Rate-limited endpoint (10 requests per 15 minutes per user)
  createFoodOrder: (data) => api.post('/mess/food-orders', data),
  getFoodOrders: (params) => api.get('/mess/food-orders', { params }), // params: { status, from_date, to_date, student_id }
  getFoodOrderById: (id) => api.get(`/mess/food-orders/${id}`),
  updateFoodOrderStatus: (id, data) => api.put(`/mess/food-orders/${id}/status`, data), // Expected data: { status }
  updatePaymentStatus: (id, data) => api.put(`/mess/food-orders/${id}/payment`, data), // Expected data: { payment_status }
  cancelFoodOrder: (id) => api.put(`/mess/food-orders/${id}/cancel`),

  // Reports
  getMonthlyFoodOrderReport: (params) => api.get('/mess/reports/monthly-food-orders', { params }), // params: { month, year }
  getSummarizedConsumptionReport: (params) => api.get('/mess/reports/consumption-summary', { params }), // params: { start_date, end_date }

  // Mess Daily Expenses Management - New API calls
  createMessDailyExpense: (data) => api.post('/mess/daily-expenses', data),
  getMessDailyExpenses: (params) => api.get('/mess/daily-expenses', { params }),
  getMessDailyExpenseById: (id) => api.get(`/mess/daily-expenses/${id}`),
  updateMessDailyExpense: (id, data) => api.put(`/mess/daily-expenses/${id}`, data),
  deleteMessDailyExpense: (id) => api.delete(`/mess/daily-expenses/${id}`),
  
  
  createExpenseType: (data) => api.post('/mess/expenses-types', data), // Keep this one
  getExpenseTypes: (params) => api.get('/mess/expenses-types', { params }),
  updateExpenseType: (id, data) => api.put(`/mess/expenses-types/${id}`, data),
  deleteExpenseType: (id) => api.delete(`/mess/expenses-types/${id}`),

  recordAdhocConsumption: (data) => api.post('/mess/special-consumption', data),
  getAdhocConsumptions: (params) => api.get('/mess/special-consumption', { params }),
  getAdhocConsumptionById: (id) => api.get(`/mess/special-consumption/${id}`),
  // createSpecialConsumption:(data) => api.post('/mess/special-consumption', data),
  // getSpecialConsumptions:(params) => api.get('/mess/special-consumption', { params }),
  // getSpecialConsumptionById:(id) => api.get(`/mess/special-consumption/${id}`),
  calculateDailyCharges: (data) => api.post('/mess/daily-charges/calculate', data),
  getRoundingAdjustments: (params) => api.get('/mess/additional-income/rounding', { params }),
  getLatestPurchaseReport:(params) => api.get('/mess/reports/latest-purchase', { params }),
  correctLastPurchase: (payload) => api.post('/mess/inventory/correct-last-purchase', payload),
  getStudentFeeBreakdown: (params) => api.get('/mess/reports/student-fee-breakdown', { params }),
  createStudentFee: (data) => api.post('/mess/student-fees', data),
  getStudents: () => api.get('/warden/students'), 
  generateMonthlyMessReport: (params) => api.get('/mess/reports/monthly-mess-bill', { params }),

};

export default api;
