import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

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
    }
    return Promise.reject(error);
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

  // Expense Type Management - Complete CRUD
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

  // Room Management
  getAvailableRooms: () => api.get('/warden/available-rooms'),
  allotRoom: (data) => api.post('/warden/room-allotment', data),

  // Attendance Management
  markAttendance: (data) => api.post('/warden/attendance', data),
  getAttendance: (params) => api.get('/warden/attendance', { params }),

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
  getAdditionalCollections: () => api.get('/warden/additional-collections')
};

// Student API - Complete
export const studentAPI = {
  // Profile
  getProfile: () => api.get('/student/profile'),
  
  // Mess Management
  getMessBills: () => api.get('/student/mess-bills'),
  getMyMessCharges: (params) => api.get('/student/mess-charges', { params }),
  
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
  
  // Meal Tokens
  getMyTokens: () => api.get('/student/tokens'),
};

// Mess API - Complete with all CRUD operations
export const messAPI = {
  // Dashboard
  getMessDashboardStats: () => api.get('/mess/dashboard-stats'),

  // Menu Management - Complete CRUD
  createMenu: (data) => api.post('/mess/menus', data),
  getMenus: (params) => api.get('/mess/menus', { params }),
  getMenuById: (id) => api.get(`/mess/menus/${id}`),
  updateMenu: (id, data) => api.put(`/mess/menus/${id}`, data),
  deleteMenu: (id) => api.delete(`/mess/menus/${id}`),

  // Item Management - Complete CRUD
  createItem: (data) => api.post('/mess/items', data),
  getItems: (params) => api.get('/mess/items', { params }),
  getItemById: (id) => api.get(`/mess/items/${id}`),
  updateItem: (id, data) => api.put(`/mess/items/${id}`, data),
  deleteItem: (id) => api.delete(`/mess/items/${id}`),

  // Item Category Management - Complete CRUD
  createItemCategory: (data) => api.post('/mess/item-categories', data),
  getItemCategories: (params) => api.get('/mess/item-categories', { params }),
  updateItemCategory: (id, data) => api.put(`/mess/item-categories/${id}`, data),
  deleteItemCategory: (id) => api.delete(`/mess/item-categories/${id}`),

  // Menu Item Management - Complete CRUD
  addItemsToMenu: (menuId, data) => api.post(`/mess/menus/${menuId}/items`, data),
  getMenuWithItems: (menuId) => api.get(`/mess/menus/${menuId}/items`),
  updateMenuItems: (menuId, data) => api.put(`/mess/menus/${menuId}/items`, data),
  removeItemFromMenu: (menuId, itemId) => api.delete(`/mess/menus/${menuId}/items/${itemId}`),

  // Cost and Analytics
  calculateMenuCost: (menuId) => api.get(`/mess/menus/${menuId}/cost`),

  // Supplier Management - Complete CRUD
  createSupplier: (data) => api.post('/mess/suppliers', data),
  getSuppliers: (params) => api.get('/mess/suppliers', { params }),
  updateSupplier: (id, data) => api.put(`/mess/suppliers/${id}`, data),
  deleteSupplier: (id) => api.delete(`/mess/suppliers/${id}`),

  // UOM Management - Complete CRUD
  createUOM: (data) => api.post('/mess/uoms', data),
  getUOMs: (params) => api.get('/mess/uoms', { params }),
  updateUOM: (id, data) => api.put(`/mess/uoms/${id}`, data),
  deleteUOM: (id) => api.delete(`/mess/uoms/${id}`),

  // Grocery Type Management - Complete CRUD
  createGroceryType: (data) => api.post('/mess/grocery-types', data),
  getGroceryTypes: (params) => api.get('/mess/grocery-types', { params }),
  updateGroceryType: (id, data) => api.put(`/mess/grocery-types/${id}`, data),
  deleteGroceryType: (id) => api.delete(`/mess/grocery-types/${id}`),

  // Grocery Management - Complete CRUD
  createGrocery: (data) => api.post('/mess/groceries', data),
  getGroceries: (params) => api.get('/mess/groceries', { params }),
  updateGrocery: (id, data) => api.put(`/mess/groceries/${id}`, data),
  deleteGrocery: (id) => api.delete(`/mess/groceries/${id}`),

  // Expense Type Management
  createExpenseType: (data) => api.post('/mess/expense-types', data),
  getExpenseTypes: (params) => api.get('/mess/expense-types', { params }),

  // Menu Scheduling
  scheduleMenu: (data) => api.post('/mess/menu-schedule', data),
  getMenuSchedule: (params) => api.get('/mess/menu-schedule', { params }),
  updateMenuSchedule: (id, data) => api.put(`/mess/menu-schedule/${id}`, data),
  deleteMenuSchedule: (id) => api.delete(`/mess/menu-schedule/${id}`),
  updateMenuScheduleStatus: (id, data) => api.put(`/mess/menu-schedule/${id}/status`, data),

  // Stock and Inventory Management
  updateItemStock: (data) => api.post('/mess/stock', data),
  getItemStock: (params) => api.get('/mess/stock', { params }),

  // Daily Consumption
  recordConsumption: (data) => api.post('/mess/consumption', data),
  getDailyConsumption: (params) => api.get('/mess/consumption', { params }),

  // Purchase Orders
  createPurchaseOrder: (data) => api.post('/mess/purchase-orders', data),
  getPurchaseOrders: (params) => api.get('/mess/purchase-orders', { params }),
  getPurchaseOrderById: (id) => api.get(`/mess/purchase-orders/${id}`),
  updatePurchaseOrder: (id, data) => api.put(`/mess/purchase-orders/${id}`, data),
  deletePurchaseOrder: (id) => api.delete(`/mess/purchase-orders/${id}`),
  updatePurchaseOrderStatus: (id, status) => api.put(`/mess/purchase-orders/${id}/status`, { status }),

  // Supplier Bills
  createSupplierBill: (data) => api.post('/mess/supplier-bills', data),
  getSupplierBills: (params) => api.get('/mess/supplier-bills', { params }),
  getSupplierBillById: (id) => api.get(`/mess/supplier-bills/${id}`),
  updateSupplierBill: (id, data) => api.put(`/mess/supplier-bills/${id}`, data),
  deleteSupplierBill: (id) => api.delete(`/mess/supplier-bills/${id}`),
  updateSupplierBillStatus: (id, status) => api.put(`/mess/supplier-bills/${id}/status`, { status }),

  // Bills and Finances
  generateMessBills: (data) => api.post('/mess/bills/generate', data),
  getMessBills: (params) => api.get('/mess/bills', { params }),
  getMessBillById: (id) => api.get(`/mess/bills/${id}`),
  updateMessBill: (id, data) => api.put(`/mess/bills/${id}`, data),
  deleteMessBill: (id) => api.delete(`/mess/bills/${id}`),

  // Other Expenses
  createOtherExpense: (data) => api.post('/mess/expenses', data),
  getOtherExpenses: (params) => api.get('/mess/expenses', { params }),
  getOtherExpenseById: (id) => api.get(`/mess/expenses/${id}`),
  updateOtherExpense: (id, data) => api.put(`/mess/expenses/${id}`, data),
  deleteOtherExpense: (id) => api.delete(`/mess/expenses/${id}`),

  // Token Management
  generateTokens: (data) => api.post('/mess/tokens/generate', data),
  getTokens: (params) => api.get('/mess/tokens', { params }),

  // Mess Fees Allotment
  allocateMessFees: (data) => api.post('/mess/fees/allocate', data),
  getMessFeesAllocation: (params) => api.get('/mess/fees/allocation', { params }),

  // Attendance and Daily Charges
  getAttendanceStatsForDate: (params) => api.get('/mess/attendance-stats', { params }),
  calculateAndApplyDailyCharges: (data) => api.post('/mess/charges/calculate-daily', data),
  getMessCharges: (params) => api.get('/mess/mess-charges', { params }),

  // Reports and Analytics
  getMonthlyReport: (params) => api.get('/mess/reports/monthly', { params }),
  getInventoryReport: (params) => api.get('/mess/reports/inventory', { params }),
  getConsumptionReport: (params) => api.get('/mess/reports/consumption', { params }),
  getExpenseReport: (params) => api.get('/mess/reports/expenses', { params }),
  getMenuPlanningReport: (params) => api.get('/mess/reports/menu-planning', { params }),
  recordBulkConsumption: (data) => api.post('/mess/consumption/bulk', data),
   createStore: (data) => api.post('/mess/stores', data),
  getStores: (params) => api.get('/mess/stores', { params }),
  updateStore: (id, data) => api.put(`/mess/stores/${id}`, data),
  deleteStore: (id) => api.delete(`/mess/stores/${id}`),
  
  // Item-Store Mapping
  mapItemToStore: (data) => api.post('/mess/item-stores', data),
  getItemStores: (params) => api.get('/mess/item-stores', { params }),
  removeItemStoreMapping: (id) => api.delete(`/mess/item-stores/${id}`),
  
  // Inventory Transactions
  recordInventoryPurchase: (data) => api.post('/mess/inventory/purchases', data),
  getInventoryTransactions: (params) => api.get('/mess/inventory/transactions', { params }),
    createSpecialFoodItem: (data) => api.post('/mess/special-food-items', data),
  getSpecialFoodItems: (params) => api.get('/mess/special-food-items', { params }),
  getSpecialFoodItemById: (id) => api.get(`/mess/special-food-items/${id}`),
  updateSpecialFoodItem: (id, data) => api.put(`/mess/special-food-items/${id}`, data),
  deleteSpecialFoodItem: (id) => api.delete(`/mess/special-food-items/${id}`),
  
  // Food Orders
  createFoodOrder: (data) => api.post('/mess/food-orders', data),
  getFoodOrders: (params) => api.get('/mess/food-orders', { params }),
  getFoodOrderById: (id) => api.get(`/mess/food-orders/${id}`),
  updateFoodOrderStatus: (id, status) => api.put(`/mess/food-orders/${id}/status`, { status }),
  updatePaymentStatus: (id, payment_status) => api.put(`/mess/food-orders/${id}/payment`, { payment_status }),
  cancelFoodOrder: (id) => api.put(`/mess/food-orders/${id}/cancel`),
  
  // Reports
  getMonthlyFoodOrderReport: (params) => api.get('/mess/reports/monthly-food-orders', { params }),
};

export default api;
