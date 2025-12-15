const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');

/**
 * Middleware to verify JWT access token
 */
const authenticate = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const { valid, decoded, error } = verifyAccessToken(token);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        error
      });
    }

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: error.message
    });
  }
};

/**
 * Middleware to check if user has specific role
 */
const requireRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      const user = await User.findById(req.user.userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!user.role.includes(requiredRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. ${requiredRole} role required.`
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        message: 'Role verification failed',
        error: error.message
      });
    }
  };
};

/**
 * Middleware for socket authentication
 */
const authenticateSocket = (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const { valid, decoded, error } = verifyAccessToken(token);

    if (!valid) {
      return next(new Error(`Authentication failed: ${error}`));
    }

    // Attach user info to socket
    socket.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      role: decoded.role
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

module.exports = {
  authenticate,
  requireRole,
  authenticateSocket
};
