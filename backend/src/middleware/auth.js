const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Authentication middleware
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.userId).select('-password -loginAttempts -lockUntil -resetPasswordToken -resetPasswordExpires -emailVerificationToken');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid - user not found.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.'
      });
    }

    // Log the access
    await AuditLog.logAction(
      'LOGIN',
      'user',
      user._id,
      user._id,
      null,
      null,
      null,
      {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      },
      'info',
      'User authenticated successfully',
      req.ip,
      req.get('User-Agent')
    );

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired.'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during authentication.',
      error: error.message
    });
  }
};

// Authorization middleware for specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Authorization middleware for hierarchy access
const authorizeHierarchy = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Super admin can access everything
    if (req.user.role === 'super_admin') {
      return next();
    }

    // For district admins, check if they can access the district
    if (req.user.role === 'district_admin') {
      if (req.params.districtId && req.user.hierarchy.district.toString() !== req.params.districtId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your district.'
        });
      }
    }

    // For sector admins, check if they can access the sector
    if (req.user.role === 'sector_admin') {
      if (req.params.sectorId && req.user.hierarchy.sector.toString() !== req.params.sectorId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your sector.'
        });
      }
    }

    // For cell admins, check if they can access the cell
    if (req.user.role === 'cell_admin') {
      if (req.params.cellId && req.user.hierarchy.cell.toString() !== req.params.cellId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your cell.'
        });
      }
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during authorization.',
      error: error.message
    });
  }
};

// Check if user can access specific resource
const canAccessResource = (user, resourceType, resourceId) => {
  // Super admin can access everything
  if (user.role === 'super_admin') {
    return true;
  }

  // For district resources
  if (resourceType === 'district') {
    return user.hierarchy.district && user.hierarchy.district.toString() === resourceId.toString();
  }

  // For sector resources
  if (resourceType === 'sector') {
    return user.hierarchy.sector && user.hierarchy.sector.toString() === resourceId.toString();
  }

  // For cell resources
  if (resourceType === 'cell') {
    return user.hierarchy.cell && user.hierarchy.cell.toString() === resourceId.toString();
  }

  // For user resources (members can only access their own profile)
  if (resourceType === 'user') {
    if (user.role === 'member') {
      return user._id.toString() === resourceId.toString();
    }
    // Admins can access users in their hierarchy
    return true;
  }

  return false;
};

// Rate limiting for sensitive operations
const rateLimitSensitive = (windowMs = 15 * 60 * 1000, max = 5) => {
  const requests = new Map();

  return (req, res, next) => {
    const key = req.ip + req.user?._id || 'anonymous';
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(key)) {
      requests.set(key, []);
    }

    const userRequests = requests.get(key);
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= max) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }

    validRequests.push(now);
    requests.set(key, validRequests);
    
    next();
  };
};

module.exports = {
  authenticate,
  authorize,
  authorizeHierarchy,
  canAccessResource,
  rateLimitSensitive
};