// routes/attendanceRoutes.js
const express = require('express');
const router = express.Router();
const { markGpsAttendance, getTodaySummary } = require('../controllers/gpsAttendanceController');
const { auth: protect } = require('../middleware/auth');

router.post('/gps', protect, markGpsAttendance);     // student & warden
router.get('/summary/today', protect, getTodaySummary); // warden only

module.exports = router;
