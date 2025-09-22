// middleware/permissions.js
const { User, Hostel } = require('../models');

/**
 * Check if user has permission to access a specific hostel
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkHostelAccess = async (req, res, next) => {
  try {
    const hostelId = req.params.hostelId || req.body.hostel_id;
    
    if (!hostelId) {
      return next(); // No hostel ID specified, proceed
    }
    
    // Admin can access any hostel
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has access to this hostel
    if (req.user.hostel_id !== parseInt(hostelId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to access this hostel' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Hostel access check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Check if user can modify inventory
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkInventoryPermission = (req, res, next) => {
  const allowedRoles = ['admin', 'mess'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'You do not have permission to modify inventory' 
    });
  }
  
  next();
};

/**
 * Check if user can approve financial transactions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkFinancePermission = (req, res, next) => {
  const allowedRoles = ['admin', 'warden'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'You do not have permission to approve financial transactions' 
    });
  }
  
  next();
};

/**
 * Check if user can generate reports
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const checkReportingPermission = (req, res, next) => {
  const allowedRoles = ['admin', 'warden', 'mess'];
  
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'You do not have permission to generate reports' 
    });
  }
  
  next();
};

module.exports = {
  checkHostelAccess,
  checkInventoryPermission,
  checkFinancePermission,
  checkReportingPermission
};
