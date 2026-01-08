import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace with your backend API
const API_BASE_URL = 'http://192.168.66.186:5001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach token if exists
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.error('Error getting token from AsyncStorage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: centralized error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    console.log('API Error:', {
      message: error.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('Unauthorized: Token expired or invalid.');
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(`API Error: ${message}`));
  }
);

/* ===========================
   AUTH APIs
=========================== */
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
  googleLogin: () => {
    console.warn('Google Login needs native implementation (expo-auth-session).');
  },
};

/* ===========================
   STUDENT APIs
=========================== */
export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  getRoommates: () => api.get('/student/roommates'),
  getMessBills: (params) => api.get('/student/mess-bills', { params }),
  getMyDailyMessCharges: (params) =>
    api.get('/student/daily-mess-charges', { params }),
  applyLeave: (data) => api.post('/student/leave-requests', data),
  getMyLeaves: () => api.get('/student/leave-requests'),
  createComplaint: (data) => api.post('/student/complaints', data),
  getMyComplaints: () => api.get('/student/complaints'),
  getTransactions: () => api.get('/student/transactions'),
  getMyAttendance: (params) => api.get('/student/attendance', { params }),
  getFacilities: () => api.get('/student/facilities'),
  useFacility: (data) => api.post('/student/facility-usage', data),
  getMyFacilityUsage: () => api.get('/student/facility-usage'),
  getSpecialFoodItems: (params) =>
    api.get('/student/special-food-items', { params }),
  getSpecialFoodItemCategories: () =>
    api.get('/student/special-food-item-categories'),
  createFoodOrder: (data) => api.post('/student/food-orders', data),
  getFoodOrders: (params) => api.get('/student/food-orders', { params }),
  cancelFoodOrder: (id) =>
    api.put(`/student/food-orders/${id}/cancel`),
  getMonthlyMessExpensesChart: () =>
    api.get('/student/chart-data/mess-expenses'),
  getMonthlyAttendanceChart: () =>
    api.get('/student/chart-data/attendance'),
  getLayout: () => api.get('/student/hostel-layout'),
  getRooms: () => api.get('/student/rooms'),
  getRoomTypes: () => api.get('/student/room-types'),
  getRoomOccupants: (roomId) =>
    api.get(`/student/rooms/${roomId}/occupants`),
  getMyRoomRequests: () => api.get('/student/room-requests'),
  requestRoomBooking: (data) =>
    api.post('/student/room-requests', data),
  cancelRoomRequest: (id) =>
    api.delete(`/student/room-requests/${id}`),
};

/* ===========================
   WARDEN APIs
=========================== */
export const wardenAPI = {
  // Dashboard & Students
  getDashboardStats: () => api.get('/warden/dashboard-stats'),
  getStudents: () => api.get('/warden/students'),
  enrollStudent: (data) => api.post('/warden/students', data),

  // Attendance
  getAttendance: (params) => api.get('/warden/attendance', { params }),
  markAttendance: (data) => api.post('/warden/attendance', data),
  bulkMarkAttendance: (data) =>
    api.post('/warden/attendance/bulk', data),
  bulkMonthEndMandays: (data) =>
    api.post('/warden/attendance/bulks', data),

  // Leaves & Day Reduction
  getLeaveRequests: (params) =>
    api.get('/warden/leave-requests', { params }),
  approveLeave: (id, data) =>
    api.put(`/warden/leave-requests/${id}/approve`, data),
  getDayReductionRequests: (params) =>
    api.get('/warden/day-reduction-requests', { params }),
  updateDayReductionRequestStatus: (id, data) =>
    api.put(`/warden/day-reduction-requests/${id}/status`, data),

  // Complaints
  getComplaints: (params) =>
    api.get('/warden/complaints', { params }),
  updateComplaint: (id, data) =>
    api.put(`/warden/complaints/${id}`, data),

  // Rooms & Layout
  getAvailableRooms: () => api.get('/warden/available-rooms'),
  getRoomOccupants: (roomId) =>
    api.get(`/warden/rooms/${roomId}/occupants`),
  allotRoom: (data) => api.post('/warden/room-allotment', data),
  getLayout: () => api.get('/warden/layout'),
  saveLayout: (data) => api.post('/warden/layout', data),

  // Room Requests
  getRoomRequests: (params) =>
    api.get('/warden/room-requests', { params }),
  decideRoomRequest: (id, data) =>
    api.put(`/warden/room-requests/${id}`, data),

  // Mess Bills
  generateMessBills: (data) =>
    api.post('/warden/mess-bills/generate', data),
  getMessBills: (params) =>
    api.get('/warden/mess-bills', { params }),
  updateMessBillStatus: (id, data) =>
    api.put(`/warden/mess-bills/${id}/status`, data),

  // Holidays
  createHoliday: (data) => api.post('/warden/holidays', data),
  getHolidays: () => api.get('/warden/holidays'),
  updateHoliday: (id, data) =>
    api.put(`/warden/holidays/${id}`, data),
  deleteHoliday: (id) =>
    api.delete(`/warden/holidays/${id}`),

  // Suspensions
  createSuspension: (data) =>
    api.post('/warden/suspensions', data),
  getSuspensions: () => api.get('/warden/suspensions'),
  updateSuspension: (id, data) =>
    api.put(`/warden/suspensions/${id}`, data),
};

export default api;
