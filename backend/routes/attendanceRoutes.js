import express from 'express';
import { markGpsAttendance, getTodaySummary } from '../controllers/gpsAttendanceController.js'; // Added .js
import { auth as protect } from '../middleware/auth.js'; // Added .js

const router = express.Router();

// Apply routes
router.post('/gps', protect, markGpsAttendance);        // student & warden
router.get('/summary/today', protect, getTodaySummary); // warden only

export default router;