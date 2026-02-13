// Make sure to update your imports at the top of the file:
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
  createHoliday, getHolidays, updateHoliday, deleteHoliday, bulkMarkAttendance,
  // Additional Collections
  createAdditionalCollection, getAdditionalCollections, updateAttendance,
  // Add these new imports
  generateMessBills, getMessBills, updateMessBillStatus,
  // Other imports
  getRoomOccupants,getMessBillSummary, bulkMonthEndMandays,getLatestDailyRate,
  // Room Type Management for Warden
  createRoomTypeWarden, updateRoomTypeWarden, deleteRoomTypeWarden, getRoomTypesWarden,
  // Room Management for Warden
  createRoomWarden, updateRoomWarden, deleteRoomWarden, getRoomsWarden,getLayout, saveLayout,getDayReductionRequestsForWarden,updateDayReductionRequestStatusByWarden,

  getRoomRequestsWarden,decideRoomRequest, getRebates, updateRebateStatus
} = require('../controllers/wardenController');
const express = require('express'); 

const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(auth);
router.use(authorize(['warden']));

// Dashboard
router.get('/dashboard-stats', getDashboardStats);
router.get('/sessions',authorize(['warden','mess']),getSessions);

// Student Management
router.post('/students',authorize(['warden','mess']), enrollStudent);
router.get('/students',authorize(['warden','mess']), getStudents);

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
router.get('/daily-rate/latest', auth, getLatestDailyRate);
// Additional Collections
router.post('/additional-collections', createAdditionalCollection);
router.get('/additional-collections', getAdditionalCollections);
// router.post('/attendance/bulk', bulkMarkAttendance); // NEW - Bulk mark attendance

// Add these routes to your existing wardenRoutes.js
// Mess Bills Management
router.post('/mess-bills/generate', generateMessBills);
router.get('/mess-bills', getMessBills);
router.put('/mess-bills/:id/status', updateMessBillStatus);

// Add this route to routes/wardenRoutes.js (inside the router, with auth and authorize middleware)

router.get('/rooms/:id/occupants', getRoomOccupants);
router.post('/attendance/bulks', bulkMonthEndMandays); // NEW - Bulk month-end mandays

// Routes (add to your warden router file, e.g., routes/warden.js)

router.post('/room-types',createRoomTypeWarden);
router.get('/room-types',getRoomTypesWarden);
router.put('/room-types/:id',updateRoomTypeWarden);
router.delete('/room-types/:id',deleteRoomTypeWarden);

router.post('/rooms',createRoomWarden);
router.get('/rooms',getRoomsWarden);
router.put('/rooms/:id',updateRoomWarden);
router.delete('/rooms/:id',deleteRoomWarden);

router.get('/layout', getLayout);
router.post('/layout', saveLayout);

router.get('/room-requests', getRoomRequestsWarden);
router.put('/room-requests/:id', decideRoomRequest);

router.get('/day-reduction-requests', getDayReductionRequestsForWarden);
router.put('/day-reduction-requests/:id/status', updateDayReductionRequestStatusByWarden); 

router.get('/rebates', getRebates);
router.put('/rebates/:id/status', updateRebateStatus);

module.exports = router;
