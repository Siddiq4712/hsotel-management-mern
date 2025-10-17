const express = require('express');
const { login, getProfile,googleAuth, googleCallback, changePassword

 } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/profile', auth, getProfile);
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);
router.put('/change-password', auth, changePassword);
module.exports = router;
