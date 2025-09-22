const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

module.exports = { login, getProfile };
