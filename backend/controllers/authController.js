import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { User, Hostel, Role } from '../models/index.js'; // Ensure the .js extension

import { Op, fn, col, where } from 'sequelize'; // Ensure these are imported
import sequelize from '../config/database.js'; // Ensure your sequelize instance is imported

// Helper to normalize roles for the frontend
const resolveUserRole = (roleValue) => {
  if (!roleValue) return null;
  const raw = String(roleValue).trim().toLowerCase();
  const roleMap = {
    admin: 'admin',
    administrator: 'admin',
    warden: 'warden',
    student: 'student',
    lapc: 'student', // Mapping lapc to student role for dashboard logic
    mess: 'mess',
    messstaff: 'mess'
  };
  return roleMap[raw] || raw;
};

const getResolvedRoleForUser = async (user) => {
  const fromRelation = resolveUserRole(user?.role?.roleName);
  if (fromRelation) return fromRelation;

  const fromInline = resolveUserRole(user?.roleName);
  if (fromInline) return fromInline;

  const roleId = user?.roleId || user?.role;
  if (roleId) {
    const roleRow = await Role.findByPk(roleId, { attributes: ['roleName'] });
    const fromRoleTable = resolveUserRole(roleRow?.roleName);
    if (fromRoleTable) return fromRoleTable;
  }

  return null;
};

export const login = async (req, res) => {
  try {
    // Accept both field names (React sends userName, some calls may send username)
    const rawIdentifier =
      req.body.username ||
      req.body.userName ||
      req.body.roll_number ||
      req.body.rollNumber ||
      req.body.email ||
      req.body.userMail;
    const identifier = rawIdentifier ? String(rawIdentifier).trim() : '';
    const identifierLower = identifier.toLowerCase();
    const { password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/Roll number and password are required' });
    }

    // FIND USER: Logic to match 'ramk' with 'RAMK J' or '2312063'
    const user = await User.findOne({
      where: {
        [Op.or]: [
          where(fn('LOWER', col('User.username')), identifierLower),
          where(fn('LOWER', col('User.roll_number')), identifierLower),
          where(fn('LOWER', col('User.email')), identifierLower)
        ]
      },
      include: [
        { model: Hostel, attributes: ['id', 'name'], required: false },
        { model: Role, as: 'role', attributes: ['roleName'], required: false }
      ]
    });

    if (!user) {
      console.error(`Login Failed: No record found for "${identifier}" in tbl_users`);
      return res.status(400).json({ message: 'User not found. Try your Roll Number.' });
    }

    // 3. Verify Password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // 4. Resolve Role Name
    // Your SQL column is 'role' (int), but model maps it to 'roleId'
    const resolvedRole = await getResolvedRoleForUser(user);
    if (!resolvedRole) {
      return res.status(403).json({ message: 'Invalid role assigned to this account.' });
    }

    // 5. Generate Token
    const token = jwt.sign(
      { userId: user.userId, role: resolvedRole, hostelId: user.hostel_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.userId,
        username: user.userName,
        role: resolvedRole,
        roleId: user.roleId,
        hostel_id: user.hostel_id,
        hostel: user.Hostel
      }
    });
  } catch (error) {
    console.error('CRITICAL LOGIN ERROR:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Hostel, attributes: ['id', 'name'] },
        { model: Role, as: 'role', attributes: ['roleName'] }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const plainUser = user.toJSON();
    plainUser.role = await getResolvedRoleForUser(user);
    if (!plainUser.role) {
      return res.status(403).json({ message: 'Invalid role assigned to this account.' });
    }
    res.json(plainUser);
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
    const resolvedRole = await getResolvedRoleForUser(user);
    if (!resolvedRole) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=invalid_role`);
    }

    const userData = {
      id: user.userId,
      email: user.userMail,
      username: user.userName,
      first_name: user.first_name,
      last_name: user.last_name,
      role: resolvedRole,
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
