// routes/studentRoutes.js - Complete version

const express = require('express');
const { 
  // Profile Management
  getProfile, updateProfile,
  // Mess Bills Management
  getMessBills, getMessBillById, getMyMessCharges,
  // Leave Management - Complete CRUD
  applyLeave, getMyLeaves, getLeaveById, updateLeave, deleteLeave,
  
  // Complaint Management - Complete CRUD
  createComplaint, getMyComplaints, getComplaintById, updateComplaint, deleteComplaint,
  
  // Transaction History
  getTransactions, getTransactionById,
  
  // Attendance
  getMyAttendance,
  
  // Facility Usage - Complete CRUD
  getFacilities, useFacility, getMyFacilityUsage, getFacilityUsageById, updateFacilityUsage, deleteFacilityUsage,
  
  // Meal Tokens
  getMyTokens, getTokenById,
  
  // Dashboard
  getDashboardStats
} = require('../controllers/studentController');

const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Apply authentication and authorization middleware
router.use(auth);
router.use(authorize(['student']));

// Dashboard Statistics
router.get('/dashboard-stats', getDashboardStats);

// Profile Management Routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Mess Bills Management Routes
router.get('/mess-bills', getMessBills);
router.get('/mess-bills/:id', getMessBillById);
router.get('/mess-charges', getMyMessCharges);

// Leave Management Routes - Complete CRUD
router.post('/leave-requests', applyLeave);           // Create leave request
router.get('/leave-requests', getMyLeaves);          // Get all my leaves with filters
router.get('/leave-requests/:id', getLeaveById);     // Get specific leave by ID
router.put('/leave-requests/:id', updateLeave);      // Update leave request (only pending)
router.delete('/leave-requests/:id', deleteLeave);   // Delete leave request (only pending)

// Complaint Management Routes - Complete CRUD
router.post('/complaints', createComplaint);         // Create new complaint
router.get('/complaints', getMyComplaints);          // Get all my complaints with filters
router.get('/complaints/:id', getComplaintById);     // Get specific complaint by ID
router.put('/complaints/:id', updateComplaint);      // Update complaint (only submitted status)
router.delete('/complaints/:id', deleteComplaint);   // Delete complaint (only submitted status)

// Transaction History Routes
router.get('/transactions', getTransactions);        // Get all transactions with filters
router.get('/transactions/:id', getTransactionById); // Get specific transaction by ID

// Attendance Routes
router.get('/attendance', getMyAttendance);          // Get attendance history with filters

// Facility Usage Routes - Complete CRUD
router.get('/facilities', getFacilities);                        // Get available facilities with filters
router.post('/facility-usage', useFacility);                     // Record new facility usage
router.get('/facility-usage', getMyFacilityUsage);               // Get all my facility usage with filters
router.get('/facility-usage/:id', getFacilityUsageById);         // Get specific facility usage by ID
router.put('/facility-usage/:id', updateFacilityUsage);          // Update facility usage (within 24 hours)
router.delete('/facility-usage/:id', deleteFacilityUsage);       // Delete facility usage (within 24 hours)

// Meal Tokens Routes
router.get('/tokens', getMyTokens);                  // Get all my tokens with filters
router.get('/tokens/:id', getTokenById);             // Get specific token by ID

module.exports = router;
