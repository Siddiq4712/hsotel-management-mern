import { normalizeRole } from '../../shared/roles.js';
import { enforceScreenPermissions } from './screenPermissions.js';
import jwt from 'jsonwebtoken';
import { User, Role } from '../models/index.js'; // Ensure the .js extension
import { canAccessRole } from '../utils/workspacePermissions.js';
import { withActivityRequest } from '../services/activityContext.js';
import { withNotificationRequest } from '../services/notificationContext.js';


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
      attributes: { exclude: ['password'] },
      include: [{ model: Role, as: 'role', attributes: ['roleName'] }]
    });

    console.log('Auth middleware - User found:', user ? user.userName : 'Not found');

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    const roleFromToken = normalizeRole(decoded.role);
    const roleFromUser = normalizeRole(user.role?.roleName || user.roleName);

    // Trust DB role over token role; reject if token role is stale/tampered.
    if (roleFromToken && roleFromUser && roleFromToken !== roleFromUser) {
      return res.status(401).json({ message: 'Token role mismatch. Please login again.' });
    }

    const resolvedRole = roleFromUser || roleFromToken;

    req.user = {
      ...user.toJSON(),
      role: resolvedRole,
      hostel_id: user.hostel_id ?? null
    };

    return withNotificationRequest(req, () => withActivityRequest(req, res, () => enforceScreenPermissions(req, res, next)));
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export const authorize = (roles) => {
  return (req, res, next) => {
    console.log('Authorize middleware - Required roles:', roles);
    console.log('Authorize middleware - User role:', req.user?.role);

    if (!req.user || !canAccessRole(req.user.role, roles)) {
      return res.status(403).json({
        message: 'Access denied',
        required: roles,
        current: req.user?.role || 'none'
      });
    }
    next();
  };
};
