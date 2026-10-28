import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, DeviceEventEmitter } from 'react-native';
import * as Device from 'expo-device';
import appConfig from '../../app.json';
import { createRequestCache } from '../utils/requestCache';
import { createSessionToken } from '../utils/sessionToken';

const dashboardCache = createRequestCache();
const sessionToken = createSessionToken(() => AsyncStorage.getItem('token'));
export const clearDashboardCache = () => dashboardCache.clear();

// Keep login, OAuth and other requests on the same configured backend.
// Android emulators reach the development computer through 10.0.2.2.
const isDevelopmentEmulator =
  __DEV__ && Platform.OS === 'android' && Device.isDevice === false;

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL ||
  (isDevelopmentEmulator
    ? 'http://10.0.2.2:5001/api'
    : appConfig.expo.extra.API_BASE_URL)
).replace(/\/+$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const setAuthToken = (token) => {
  sessionToken.set(token);
  if (api.defaults.headers.common.Authorization !== (token ? `Bearer ${token}` : undefined)) clearDashboardCache();
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

// Request interceptor: attach token if exists
api.interceptors.request.use(
  async (config) => {
    if (!['get', 'head', 'options'].includes(String(config.method || 'get').toLowerCase())) clearDashboardCache();
    try {
      const token = await sessionToken.get();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        delete config.headers.Authorization;
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
  (response) => {
    if (!['get', 'head', 'options'].includes(String(response.config?.method || 'get').toLowerCase())) clearDashboardCache();
    return response;
  },
  async (error) => {
    if ([401, 403].includes(error.response?.status)
      || !['get', 'head', 'options'].includes(String(error.config?.method || 'get').toLowerCase())) clearDashboardCache();
    console.log('API Error:', {
      url: `${error.config?.baseURL || API_BASE_URL}${error.config?.url || ''}`,
      message: error.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    if (error.response?.data?.code === 'SCREEN_PERMISSION_DENIED') DeviceEventEmitter.emit('permissions-changed');
    if (error.response?.status === 401) {
      setAuthToken(null);
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      console.log('Unauthorized: Token expired or invalid.');
    }

    const message =
      error.response?.data?.message ||
      (!error.response && error.request
        ? (isDevelopmentEmulator
          ? 'Cannot connect to the server. Check that the backend is running on your computer on port 5001.'
          : 'Cannot connect to the server. Check that the backend is running and your phone and computer are on the same Wi-Fi.')
        : null) ||
      error.message ||
      'An unexpected error occurred';

    return Promise.reject(new Error(`API Error: ${message}`));
  }
);

// Only dashboard callers opt in; operational screens always use live endpoints.
export const getDashboardResource = (path, params = {}, options = {}) => {
  const key = JSON.stringify([path, Object.keys(params).sort().map(key => [key, params[key]])]);
  return dashboardCache.get(key, async () => {
    const response = await api.get(path, { params });
    return { data: response.data };
  }, { force: options.force === true });
};

/* ===========================
   AUTH APIs
=========================== */
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  changePassword: (data) => api.put('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data, { timeout: 60000 }),
  verifyPasswordOtp: (data) => api.post('/auth/verify-password-otp', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
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
  getTransactions: (params) => api.get('/student/transactions', { params }),
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
  getAttendanceRoster:()=>api.get('/warden/attendance/roster'),
  // Dashboard & Students
  getDashboardStats: () => api.get('/warden/dashboard-stats'),
  getSessions: () => api.get('/warden/sessions'),
  getStudents: (params) => api.get('/warden/students', params ? { params } : undefined),
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

/* ===========================
   GPS ATTENDANCE APIs
=========================== */
export const gpsAttendanceAPI = {
  startSession: (data) => api.post('/attendance/gps/session/start', data),
  getActiveSession: (params) => api.get('/attendance/gps/session/active', { params }),
  getSessionSummary: (id) => api.get(`/attendance/gps/session/${id}/summary`),
  closeSession: (id) => api.post(`/attendance/gps/session/${id}/close`),
  markAttendance: (data) => api.post('/attendance/gps/mark', data),
};

/* ===========================
   OUTPASS APIs
=========================== */
export const outpassAPI = {
  getWardenOutpasses: (params) => api.get('/outpass/warden', { params }),
  approveOutpass: (id, remarks) => api.put(`/outpass/approve/${id}`, { remarks }),
  rejectOutpass: (id, remarks) => api.put(`/outpass/reject/${id}`, { remarks }),
  createOutpass: (data) => api.post('/outpass', data),
  getMyOutpasses: () => api.get('/outpass/my'),
  getCurrentOutpass: () => api.get('/outpass/current'),
  cancelOutpass: (id) => api.delete(`/outpass/cancel/${id}`),
  scanOutpassQR: (qrToken) => api.post('/outpass/scan', { qrToken }),
  getTodayGateActivity: () => api.get('/outpass/today-activity'),
  getStudentsCurrentlyOutside: () => api.get('/outpass/outside'),
  getRecentScans: () => api.get('/outpass/recent-scans'),
};

export default api;

export const notificationAPI = {
  getNotifications: params => api.get('/notifications', { params }),
  markRead: id => api.patch(`/notifications/${id}/read`),
  markAllRead: data => api.patch('/notifications/read-all', data),
};

// Existing parent routes; authorization and linked-student checks stay on the server.
export const parentAPI = {
  getStudents: () => api.get('/parent/students'),
  getStudentDashboard: studentId => api.get(`/parent/dashboard/${studentId}`),
  getNotifications: () => api.get('/parent/notifications'),
  markNotificationRead: id => api.put(`/parent/notifications/${id}/read`),
};

export const reductionAPI = {
  list:(role,params)=>api.get('/'+role+'/day-reduction-requests',{params}),
  submit:data=>api.post('/student/day-reduction-requests',data,{headers:{'Content-Type':'multipart/form-data'}}),
  revise:(id,data)=>api.put('/student/day-reduction-requests/'+id,data,{headers:{'Content-Type':'multipart/form-data'}}),
  decide:(role,id,data)=>api.put('/'+role+'/day-reduction-requests/'+id+'/status',data)
};
