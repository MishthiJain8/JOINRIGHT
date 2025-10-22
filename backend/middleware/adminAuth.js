import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import logger from '../utils/logger.js';

// CRITICAL: Use the EXACT same JWT_SECRET as auth.js
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Log the JWT_SECRET for debugging (remove in production)
console.log('🔐 AdminAuth JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...');

// Middleware to verify admin authentication
export const requireAdmin = async (req, res, next) => {
  try {
    // Get the token from the Authorization header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn(`Admin access attempted without token from IP: ${req.ip}`);
      return res.status(401).json({
        error: 'Access denied. Admin token required.',
        code: 'ADMIN_TOKEN_REQUIRED'
      });
    }

    // CRITICAL: Verify token using the same JWT_SECRET
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      logger.warn(`Admin access attempted with invalid user ID from IP: ${req.ip}`);
      return res.status(401).json({
        error: 'Invalid token. User not found.',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }

    if (!user.isActive) {
      logger.warn(`Deactivated user attempted admin access: ${user.email} from IP: ${req.ip}`);
      return res.status(403).json({
        error: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (user.role !== 'admin') {
      logger.warn(`Non-admin user attempted admin access: ${user.email} from IP: ${req.ip}`);
      return res.status(403).json({
        error: 'Access denied. Admin privileges required.',
        code: 'ADMIN_PRIVILEGES_REQUIRED'
      });
    }

    logger.info(`Admin authenticated: ${user.email} from IP: ${req.ip}`);
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    next();
  } catch (error) {
    logger.error('Admin authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please log in again.',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    res.status(401).json({
      error: 'Invalid token.',
      code: 'INVALID_TOKEN'
    });
  }
};

// Middleware to verify admin or moderator access
export const requireAdminOrModerator = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      logger.warn(`Admin/Moderator access attempted without token from IP: ${req.ip}`);
      return res.status(401).json({
        error: 'Access denied. Admin/Moderator token required.',
        code: 'ADMIN_TOKEN_REQUIRED'
      });
    }

    // CRITICAL: Use the same JWT_SECRET as all other middlewares
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      logger.warn(`Admin/Moderator access attempted with invalid user ID from IP: ${req.ip}`);
      return res.status(401).json({
        error: 'Invalid token. User not found.',
        code: 'INVALID_ADMIN_TOKEN'
      });
    }

    if (!user.isActive) {
      logger.warn(`Deactivated user attempted admin/moderator access: ${user.email} from IP: ${req.ip}`);
      return res.status(403).json({
        error: 'Account is deactivated.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (!['admin', 'moderator'].includes(user.role)) {
      logger.warn(`Unauthorized user attempted admin access: ${user.email} from IP: ${req.ip}`);
      return res.status(403).json({
        error: 'Access denied. Admin or Moderator privileges required.',
        code: 'ADMIN_PRIVILEGES_REQUIRED'
      });
    }

    logger.info(`Admin/Moderator authenticated: ${user.email} (${user.role}) from IP: ${req.ip}`);
    req.user = user;
    req.userId = user._id;
    req.userRole = user.role;
    next();
  } catch (error) {
    logger.error('Admin/Moderator authentication error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired. Please log in again.',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    res.status(401).json({
      error: 'Invalid token.',
      code: 'INVALID_TOKEN'
    });
  }
};

// Utility to check if current user is admin
export const isAdmin = (user) => {
  return user && user.role === 'admin';
};

// Utility to check if current user is admin or moderator
export const isAdminOrModerator = (user) => {
  return user && ['admin', 'moderator'].includes(user.role);
};