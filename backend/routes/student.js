// In studentRoutes.js
const express = require('express');
const {
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
} = require('../controllers/studentController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(authorize(['student']));

// Dashboard Statistics
router.get('/dashboard-stats', getDashboardStats);

// Profile Management Routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Mess Bills Management Routes
router.get('/mess-bills', getMessBills); // Already correctly defined
router.get('/mess-bills/:id', getMessBillById);
router.get('/mess-charges', getMyMessCharges);

// Leave Management Routes
router.post('/leave-requests', applyLeave);
router.get('/leave-requests', getMyLeaves);
router.get('/leave-requests/:id', getLeaveById);
router.put('/leave-requests/:id', updateLeave);
router.delete('/leave-requests/:id', deleteLeave);

// Complaint Management Routes
router.post('/complaints', createComplaint);
router.get('/complaints', getMyComplaints);
router.get('/complaints/:id', getComplaintById);
router.put('/complaints/:id', updateComplaint);
router.delete('/complaints/:id', deleteComplaint);

// Transaction History Routes
router.get('/transactions', getTransactions);
router.get('/transactions/:id', getTransactionById);

// Attendance Routes
router.get('/attendance', getMyAttendance);

// Facility Usage Routes
router.get('/facilities', getFacilities);
router.post('/facility-usage', useFacility);
router.get('/facility-usage', getMyFacilityUsage);
router.get('/facility-usage/:id', getFacilityUsageById);
router.put('/facility-usage/:id', updateFacilityUsage);
router.delete('/facility-usage/:id', deleteFacilityUsage);

// Meal Tokens Routes
router.get('/tokens', getMyTokens);
router.get('/tokens/:id', getTokenById);

module.exports = router;