import express from 'express';
import { auth } from '../middleware/auth.js';
import { listNotifications, readNotification, readAllNotifications } from '../controllers/notificationController.js';

const router=express.Router();
router.use(auth);
router.get('/',listNotifications);
router.patch('/read-all',readAllNotifications);
router.patch('/:id/read',readNotification);
export default router;
