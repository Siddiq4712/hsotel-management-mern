// routes/wardenRoutes.js
const express = require('express');
const {
  enrollStudent, getStudents, getAvailableRooms, allotRoom, getDashboardStats, getSessions,
  // Attendance Management
  markAttendance, getAttendance,
  // Leave Management - Updated with new functions
  getLeaveRequests, getPendingLeaves, approveLeave,
  // Complaint Management - Updated with new functions
  getComplaints, getPendingComplaints, updateComplaint,
  // Suspension Management
  createSuspension, getSuspensions, updateSuspension,
  // Holiday Management
  createHoliday, getHolidays, updateHoliday, deleteHoliday,bulkMarkAttendance,
  // Additional Collections
  createAdditionalCollection, getAdditionalCollections,updateAttendance,
  //bulkMarkAttendance, 
  getRoomOccupants
} = require('../controllers/wardenController');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(authorize(['warden']));

// Dashboard
router.get('/dashboard-stats', getDashboardStats);
router.get('/sessions', getSessions);

// Student Management
router.post('/students', enrollStudent);
router.get('/students', getStudents);

// Room Management
router.get('/available-rooms', getAvailableRooms);
router.post('/room-allotment', allotRoom);

// Attendance Management
router.post('/attendance', markAttendance);
router.post('/attendance/bulk', bulkMarkAttendance);
router.get('/attendance', getAttendance);
router.put('/attendance/:id', updateAttendance);
// Leave Management - Updated with new endpoints
router.get('/leave-requests', getLeaveRequests);
router.get('/leave-requests/pending', getPendingLeaves); // NEW - Get only pending leaves
router.put('/leave-requests/:id/approve', approveLeave);
// Alternative route for consistency
router.put('/leave-requests/:id/status', approveLeave); // NEW - Alternative endpoint

// Complaint Management - Updated with new endpoints
router.get('/complaints', getComplaints);
router.get('/complaints/pending', getPendingComplaints); // NEW - Get only pending complaints
router.put('/complaints/:id', updateComplaint);
router.put('/complaints/:id/status', updateComplaint); // NEW - Alternative endpoint for status updates

// Suspension Management
router.post('/suspensions', createSuspension);
router.get('/suspensions', getSuspensions);
router.put('/suspensions/:id', updateSuspension);

// Holiday Management
router.post('/holidays', createHoliday);
router.get('/holidays', getHolidays);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

// Additional Collections
router.post('/additional-collections', createAdditionalCollection);
router.get('/additional-collections', getAdditionalCollections);
// router.post('/attendance/bulk', bulkMarkAttendance); // NEW - Bulk mark attendance

// router.get('/rooms/:room_id/occupants', getRoomOccupants); // NEW - Get occupants of a specific room

module.exports = router;
