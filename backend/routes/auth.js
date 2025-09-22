const express = require('express');
const { login, getProfile } = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.get('/profile', auth, getProfile);

module.exports = router;
