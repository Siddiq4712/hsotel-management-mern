import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants'; // For accessing app.json extra properties

const API_BASE_URL = Constants.expoConfig.extra.API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add token
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error getting token from AsyncStorage:', error);
  }
  return config;
});

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear storage and redirect to login if unauthorized
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // In a real app, you'd navigate programmatically, e.g., using a navigation ref
      // For now, we'll log and rely on AuthContext to detect logout.
      console.log('Unauthorized: Token expired or invalid. Redirecting to login.');
      // A global event or a navigation ref would be used here to navigate.
      // For this example, AuthContext will handle state change.
    }
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    return Promise.reject(new Error(`API Error: ${message}`));
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getProfile: () => api.get('/auth/profile'),
  // Google login via web browser might be complex in RN.
  // For RN, usually use expo-auth-session and deep linking.
  // This is a placeholder for direct web-based OAuth for now if applicable,
  // but a native flow is preferred for mobile.
  googleLogin: () => {
    // In React Native, this would typically involve expo-auth-session
    // and deep linking, rather than window.location.href.
    // This is a simplified placeholder.
    console.warn("Google Login needs native implementation with expo-auth-session.");
    // Example: AuthSession.startAsync({ authUrl: `${API_BASE_URL}/auth/google` })
  },
  changePassword: (data) => api.put('/auth/change-password', data),
};

// Student API
export const studentAPI = {
  getProfile: () => api.get('/student/profile'),
  getRoommates: () => api.get('/student/roommates'), // Updated endpoint based on your controller
  getMessBills: (params) => api.get('/student/mess-bills', { params }),
  getMyDailyMessCharges: (params) => api.get('/student/daily-mess-charges', { params }),
  applyLeave: (data) => api.post('/student/leave-requests', data),
  getMyLeaves: () => api.get('/student/leave-requests'),
  createComplaint: (data) => api.post('/student/complaints', data),
  getMyComplaints: () => api.get('/student/complaints'),
  getTransactions: () => api.get('/student/transactions'),
  getMyAttendance: (params) => api.get('/student/attendance', { params }),
  getFacilities: () => api.get('/student/facilities'),
  useFacility: (data) => api.post('/student/facility-usage', data),
  getMyFacilityUsage: () => api.get('/student/facility-usage'),
  getSpecialFoodItems: (params) => api.get('/student/special-food-items', { params }),
  getSpecialFoodItemCategories: () => api.get('/student/special-food-item-categories'),
  createFoodOrder: (data) => api.post('/student/food-orders', data),
  getFoodOrders: (params) => api.get('/student/food-orders', { params }),
  cancelFoodOrder: (id) => api.put(`/student/food-orders/${id}/cancel`),
  getMonthlyMessExpensesChart: () => api.get('/student/chart-data/mess-expenses'),
  getMonthlyAttendanceChart: () => api.get('/student/chart-data/attendance'),
  getLayout: () => api.get('/student/hostel-layout'),
  getRooms: () => api.get('/student/rooms'),
  getRoomTypes: () => api.get('/student/room-types'),
  getRoomOccupants: (roomId) => api.get(`/student/rooms/${roomId}/occupants`),
  getMyRoomRequests: () => api.get('/student/room-requests'),
  requestRoomBooking: (data) => api.post('/student/room-requests', data),
  cancelRoomRequest: (id) => api.delete(`/student/room-requests/${id}`),
};

export default api;
