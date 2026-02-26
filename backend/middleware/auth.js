import jwt from 'jsonwebtoken';
import { User } from '../models/index.js'; // Ensure the .js extension

const normalizeRole = (role) => {
  if (role === null || role === undefined) return null;

  const normalized = String(role).trim().toLowerCase();
  const roleMap = {
    admin: 'admin',
    administrator: 'admin',
    1: 'admin',
    warden: 'warden',
    3: 'warden',
    student: 'student',
    2: 'student',
    lapc: 'lapc',
    mess: 'mess',
    messstaff: 'mess',
    'mess staff': 'mess',
    4: 'mess'
  };

  return roleMap[normalized] || normalized;
};

export const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Auth middleware - Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Decoded token:', decoded);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    console.log('Auth middleware - User found:', user ? user.userName : 'Not found');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const roleFromToken = normalizeRole(decoded.role);
    const roleFromUser = normalizeRole(user.role || user.roleName || user.roleId);
    const resolvedRole = roleFromToken || roleFromUser;

    req.user = {
      ...user.toJSON(),
      role: resolvedRole
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const authorize = (roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware - Required roles:', roles);
    console.log('Authorize middleware - User role:', req.user?.role);
    
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied',
        required: roles,
        current: req.user?.role || 'none'
      });
    }
    next();
  };
};
