const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');

const { User, Hostel } = require('../models');

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user - REMOVE is_active: true
    const user = await User.findOne({
      where: { username }, // ✅ Removed is_active: true
      include: [{ model: Hostel, attributes: ['id', 'name'] }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid user' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(password);
      console.log(user.password);
      return res.status(400).json({ message: 'Invalid pass' });
    }

    // Generate JWT
    const payload = {
      userId: user.id,
      role: user.role,
      hostelId: user.hostel_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        hostel_id: user.hostel_id,
        hostel: user.Hostel
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: Hostel, attributes: ['id', 'name'] }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
const googleAuth = (req, res, next) => {
  // This will redirect to Google
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res, next);
};

const googleCallback = (req, res, next) => {
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=access_denied`,
    session: false 
  }, async (err, user, info) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=not_registered`);
    }

    // Generate JWT using only Gmail and user ID
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email // only Gmail
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    // Prepare user data to send to frontend
    const userData = {
      id: user.id,
      email: user.email,
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      hostel_id: user.hostel_id
    };

    // Redirect with token **and user data**
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);

  })(req, res, next);
};

module.exports = { 
  login,
  getProfile,
  googleAuth,
  googleCallback, };
