import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getProfile,
  updateProfile,
  getMessBills,
  getMessBillById,
  getMyMessCharges,
  applyLeave,
  getMyLeaves,
  getLeaveById,
  updateLeave,
  deleteLeave,
  createComplaint,
  getMyComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getTransactions,
  getTransactionById,
  getMyAttendance,
  getFacilities,
  useFacility,
  getMyFacilityUsage,
  getFacilityUsageById,
  updateFacilityUsage,
  deleteFacilityUsage,
  getMyTokens,
  getTokenById,
  getDashboardStats,
  getAvailableSpecialFoodItems,
  getSpecialFoodItemCategories,
  getMyDailyMessCharges,
  getMonthlyMessExpensesChartData,
  getMonthlyAttendanceChartData,
  getRoommates,
  getStudentHostelLayout,
  getStudentRooms,
  getStudentRoomTypes,
  getStudentRoomOccupants,
  getMyRoomRequests,
  requestRoomBooking,
  cancelRoomRequest,
  applyDayReduction,
  getMyDayReductionRequests,
  applyRebate,
  getMyRebates
} from '../controllers/studentController.js'; // Added .js extension

import {
  createFoodOrder,
  getFoodOrders,
  getFoodOrderById,
  cancelFoodOrder,
} from '../controllers/messController.js'; // Added .js extension

import { auth, authorize } from '../middleware/auth.js'; // Added .js extension

const router = express.Router();

// Rate limiting configuration
const createOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each user to 10 food order creations per window
  message: 'Too many food order requests, please try again later.'
});

// Apply global auth for all student routes
router.use(auth);
router.use(authorize(['student', 'lapc']));

/* ---------- DASHBOARD & CHARTS ---------- */
router.get('/dashboard-stats', getDashboardStats);
router.get('/daily-mess-charges', getMyDailyMessCharges);
router.get('/chart-data/mess-expenses', getMonthlyMessExpensesChartData);
router.get('/chart-data/attendance', getMonthlyAttendanceChartData);

/* ---------- PROFILE MANAGEMENT ---------- */
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.get('/roommates', getRoommates);

/* ---------- MESS & BILLS ---------- */
router.get('/mess-bills', getMessBills);
router.get('/mess-bills/:id', getMessBillById);

/* ---------- LEAVE MANAGEMENT ---------- */
router.post('/leave-requests', applyLeave);
router.get('/leave-requests', getMyLeaves);
router.get('/leave-requests/:id', getLeaveById);
router.put('/leave-requests/:id', updateLeave);
router.delete('/leave-requests/:id', deleteLeave);

/* ---------- COMPLAINT MANAGEMENT ---------- */
router.post('/complaints', createComplaint);
router.get('/complaints', getMyComplaints);
router.get('/complaints/:id', getComplaintById);
router.put('/complaints/:id', updateComplaint);
router.delete('/complaints/:id', deleteComplaint);

/* ---------- TRANSACTIONS & ATTENDANCE ---------- */
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);
router.get('/attendance', getMyAttendance);

/* ---------- FACILITY USAGE ---------- */
router.get('/facilities', getFacilities);
router.post('/facility-usage', useFacility);
router.get('/facility-usage', getMyFacilityUsage);
router.get('/facility-usage/:id', getFacilityUsageById);
router.put('/facility-usage/:id', updateFacilityUsage);
router.delete('/facility-usage/:id', deleteFacilityUsage);

/* ---------- MEAL TOKENS ---------- */
router.get('/tokens', getMyTokens);
router.get('/tokens/:id', getTokenById);

/* ---------- SPECIAL FOOD & ORDERS ---------- */
router.get('/special-food-items', getAvailableSpecialFoodItems);
router.get('/special-food-item-categories', getSpecialFoodItemCategories);
router.post('/food-orders', createOrderLimiter, createFoodOrder);
router.get('/food-orders', getFoodOrders);
router.get('/food-orders/:id', getFoodOrderById);
router.put('/food-orders/:id/cancel', cancelFoodOrder);

/* ---------- HOSTEL LAYOUT & ROOM BOOKING ---------- */
router.get('/hostel-layout', getStudentHostelLayout);
router.get('/rooms', getStudentRooms);
router.get('/room-types', getStudentRoomTypes);
router.get('/rooms/:id/occupants', getStudentRoomOccupants);
router.get('/room-requests', getMyRoomRequests);
router.post('/room-requests', requestRoomBooking);
router.delete('/room-requests/:id', cancelRoomRequest);

/* ---------- REDUCTIONS & REBATES ---------- */
router.post('/day-reduction-requests', applyDayReduction);
router.get('/day-reduction-requests', getMyDayReductionRequests);
router.post('/rebates', applyRebate);
router.get('/rebates', getMyRebates);

export default router;