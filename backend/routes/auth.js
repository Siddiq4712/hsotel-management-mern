import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { forgotPassword, verifyPasswordOtp, resetPassword } from '../controllers/passwordResetController.js';
import { 
  login, 
  getProfile, 
  googleAuth, 
  googleCallback, 
  changePassword 
} from '../controllers/authController.js'; // Added .js extension
import { auth } from '../middleware/auth.js'; // Added .js extension

const router = express.Router();
const resetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
  message: { message: 'Too many password reset attempts. Please try again in 15 minutes.' } });
router.post('/forgot-password', resetLimiter, forgotPassword);
router.post('/verify-password-otp', resetLimiter, verifyPasswordOtp);
router.post('/reset-password', resetLimiter, resetPassword);

router.post('/login', login);
router.get('/profile', auth, getProfile);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.put('/change-password', auth, changePassword);

export default router;
