import express from 'express';
import {
  enrollStudent, getStudents, getAvailableRooms, allotRoom, getDashboardStats, getSessions,
  // Attendance Management
  markAttendance, getAttendance,
  // Leave Management
  getLeaveRequests, getPendingLeaves, approveLeave,
  // Complaint Management
  getComplaints, getPendingComplaints, updateComplaint,
  // Suspension Management
  createSuspension, getSuspensions, updateSuspension,
  // Holiday Management
  createHoliday, getHolidays, updateHoliday, deleteHoliday, bulkMarkAttendance,
  // Additional Collections
  createAdditionalCollection, getAdditionalCollections, updateAttendance,
  // Mess Bills
  generateMessBills, getMessBills, updateMessBillStatus,
  // Others
  getRoomOccupants, bulkMonthEndMandays, getLatestDailyRate,
  // Room Type Management
  createRoomTypeWarden, updateRoomTypeWarden, deleteRoomTypeWarden, getRoomTypesWarden,
  // Room Management
  createRoomWarden, updateRoomWarden, deleteRoomWarden, getRoomsWarden, getLayout, saveLayout,
  // Reductions & Rebates
  getDayReductionRequestsForWarden, updateDayReductionRequestStatusByWarden,
  getRoomRequestsWarden, decideRoomRequest, getRebates, updateRebateStatus
} from '../controllers/wardenController.js'; // Added .js extension

import { auth, authorize } from '../middleware/auth.js'; // Added .js extension

const router = express.Router();

// Apply auth and base authorize to all routes in this file
router.use(auth);
router.use(authorize(['warden']));

/* ---------- DASHBOARD & SESSIONS ---------- */
router.get('/dashboard-stats', getDashboardStats);
router.get('/sessions', authorize(['warden', 'mess']), getSessions);

/* ---------- STUDENT MANAGEMENT ---------- */
router.post('/students', authorize(['warden', 'mess']), enrollStudent);
router.get('/students', authorize(['warden', 'mess']), getStudents);

/* ---------- ROOM MANAGEMENT ---------- */
router.get('/available-rooms', getAvailableRooms);
router.post('/room-allotment', allotRoom);
router.get('/rooms/:id/occupants', getRoomOccupants);

/* ---------- ATTENDANCE MANAGEMENT ---------- */
router.post('/attendance', markAttendance);
router.post('/attendance/bulk', bulkMarkAttendance);
router.post('/attendance/bulks', bulkMonthEndMandays); 
router.get('/attendance', getAttendance);
router.put('/attendance/:id', updateAttendance);

/* ---------- LEAVE MANAGEMENT ---------- */
router.get('/leave-requests', getLeaveRequests);
router.get('/leave-requests/pending', getPendingLeaves);
router.put('/leave-requests/:id/approve', approveLeave);
router.put('/leave-requests/:id/status', approveLeave);

/* ---------- COMPLAINT MANAGEMENT ---------- */
router.get('/complaints', getComplaints);
router.get('/complaints/pending', getPendingComplaints);
router.put('/complaints/:id', updateComplaint);
router.put('/complaints/:id/status', updateComplaint);

/* ---------- SUSPENSION MANAGEMENT ---------- */
router.post('/suspensions', createSuspension);
router.get('/suspensions', getSuspensions);
router.put('/suspensions/:id', updateSuspension);

/* ---------- HOLIDAY MANAGEMENT ---------- */
router.post('/holidays', createHoliday);
router.get('/holidays', getHolidays);
router.put('/holidays/:id', updateHoliday);
router.delete('/holidays/:id', deleteHoliday);

/* ---------- DAILY RATE & COLLECTIONS ---------- */
router.get('/daily-rate/latest', getLatestDailyRate);
router.post('/additional-collections', createAdditionalCollection);
router.get('/additional-collections', getAdditionalCollections);

/* ---------- MESS BILLS ---------- */
router.post('/mess-bills/generate', generateMessBills);
router.get('/mess-bills', getMessBills);
router.put('/mess-bills/:id/status', updateMessBillStatus);

/* ---------- ROOM TYPE & ROOM CRUD (WARDEN) ---------- */
router.post('/room-types', createRoomTypeWarden);
router.get('/room-types', getRoomTypesWarden);
router.put('/room-types/:id', updateRoomTypeWarden);
router.delete('/room-types/:id', deleteRoomTypeWarden);

router.post('/rooms', createRoomWarden);
router.get('/rooms', getRoomsWarden);
router.put('/rooms/:id', updateRoomWarden);
router.delete('/rooms/:id', deleteRoomWarden);

/* ---------- LAYOUT & REQUESTS ---------- */
router.get('/layout', getLayout);
router.post('/layout', saveLayout);

router.get('/room-requests', getRoomRequestsWarden);
router.put('/room-requests/:id', decideRoomRequest);

router.get('/day-reduction-requests', getDayReductionRequestsForWarden);
router.put('/day-reduction-requests/:id/status', updateDayReductionRequestStatusByWarden); 

router.get('/rebates', getRebates);
router.put('/rebates/:id/status', updateRebateStatus);

export default router;