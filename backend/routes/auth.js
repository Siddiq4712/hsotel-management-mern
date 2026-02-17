import express from 'express';
import { 
  login, 
  getProfile, 
  googleAuth, 
  googleCallback, 
  changePassword 
} from '../controllers/authController.js'; // Added .js extension
import { auth } from '../middleware/auth.js'; // Added .js extension

const router = express.Router();

router.post('/login', login);
router.get('/profile', auth, getProfile);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.put('/change-password', auth, changePassword);

export default router;