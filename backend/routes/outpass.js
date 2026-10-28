import express from 'express';
import { installAdminWorkspace } from '../middleware/adminWorkspace.js';
import { auth, authorize } from '../middleware/auth.js';
import {
  createOutpass,
  getMyOutpasses,
  getCurrentOutpass,
  cancelOutpass,
  getWardenOutpasses,
  approveOutpass,
  rejectOutpass,
  scanOutpassQR,
  getTodayGateActivity,
  getStudentsCurrentlyOutside,
  getRecentScans,
  getAllOutpasses,
  toggleParentApproval
} from '../controllers/outpassController.js';

const router = express.Router();
installAdminWorkspace(router, 'outpass');

// Apply auth middleware to all outpass routes
router.use(auth);

// Student outpass routes
router.post('/', authorize(['student']), createOutpass);
router.get('/my', authorize(['student']), getMyOutpasses);
router.get('/current', authorize(['student']), getCurrentOutpass);
router.delete('/cancel/:id', authorize(['student']), cancelOutpass);

// Warden outpass routes
router.get('/warden', authorize(['warden']), getWardenOutpasses);
router.put('/approve/:id', authorize(['warden']), approveOutpass);
router.put('/reject/:id', authorize(['warden']), rejectOutpass);

// Security outpass routes
router.post('/scan', authorize(['security']), scanOutpassQR);
router.get('/today-activity', authorize(['security']), getTodayGateActivity);
router.get('/outside', authorize(['security']), getStudentsCurrentlyOutside);
router.get('/recent-scans', authorize(['security']), getRecentScans);

// Admin outpass routes
router.get('/admin/all', authorize(['admin']), getAllOutpasses);
router.post('/admin/toggle-approval', authorize(['admin']), toggleParentApproval);

export default router;
