import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { Op } from 'sequelize';
import { User, Hostel, Role } from '../models/index.js'; // Ensure the .js extension

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find user by username OR roll_number
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { userName: username },
          { roll_number: username }
        ]
      },
      include: [{ model: Hostel, attributes: ['id', 'name'] }, { model: Role, as: 'role', attributes: ['roleName'] }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid user' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid pass' });
    }

    // Generate JWT
    const payload = {
      userId: user.userId,
      role: user.role?.roleName || user.roleId,
      hostelId: user.hostel_id
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.userId,
        username: user.userName,
        role: user.role?.roleName || user.roleId,
        hostel_id: user.hostel_id,
        hostel: user.Hostel
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] },
      include: [{ model: Hostel, attributes: ['id', 'name'] }, { model: Role, as: 'role', attributes: ['roleName'] }]
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

export const googleAuth = (req, res, next) => {
  // This will redirect to Google
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })(req, res, next);
};

export const googleCallback = (req, res, next) => {
  passport.authenticate('google', { 
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=access_denied`,
    session: false 
  }, async (err, user, info) => {
    if (err || !user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=not_registered`);
    }

    // Generate JWT
    const token = jwt.sign(
      { 
        userId: user.userId, 
        email: user.userMail
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    // Prepare user data to send to frontend
    const userData = {
      id: user.userId,
      email: user.userMail,
      username: user.userName,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role?.roleName || user.roleId,
      hostel_id: user.hostel_id,
      profile_picture: user.profile_picture || user.dataValues.profile_picture
    };

    // Redirect with token and user data
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
    res.redirect(redirectUrl);
  })(req, res, next);
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.userId;
    
    // Get the user with their current password
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify the old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update the user's password
    await user.update({ password: hashedPassword });
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

