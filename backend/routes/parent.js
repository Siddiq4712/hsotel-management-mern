import express from 'express';
import { auth, authorize } from '../middleware/auth.js';
import {
  getLinkedStudents,
  getStudentDashboard,
  updateProfile,
  getParentNotifications,
  markNotificationRead
} from '../controllers/parentController.js';

const router = express.Router();

router.use(auth);
router.use(authorize(['parent']));

router.get('/students', getLinkedStudents);
router.get('/dashboard/:studentId', getStudentDashboard);
router.put('/profile', updateProfile);
router.get('/notifications', getParentNotifications);
router.put('/notifications/:id/read', markNotificationRead);

export default router;
