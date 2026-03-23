import express from 'express';
import { markGpsAttendance, getTodaySummary } from '../controllers/gpsAttendanceController.js';
import {
  startGpsSession,
  getActiveGpsSession,
  getGpsSessionSummary,
  closeGpsSession
} from '../controllers/gpsAttendanceSessionController.js';
import { auth as protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply routes
router.post('/gps/mark', protect, markGpsAttendance);        // student
router.get('/summary/today', protect, getTodaySummary); // all roles

// GPS session management (warden)
router.post('/gps/session/start', protect, authorize(['warden']), startGpsSession);
router.get('/gps/session/active', protect, getActiveGpsSession);
router.get('/gps/session/:id/summary', protect, authorize(['warden']), getGpsSessionSummary);
router.post('/gps/session/:id/close', protect, authorize(['warden']), closeGpsSession);

export default router;
