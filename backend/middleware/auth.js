import jwt from 'jsonwebtoken';
import User from '../models/user.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Log the JWT_SECRET for debugging (remove in production)
console.log('🔐 Auth JWT_SECRET:', JWT_SECRET.substring(0, 20) + '...');

// Generate JWT token
export const generateToken = (userId, email, expiresIn = '24h') => {
  return jwt.sign(
    { 
      userId, 
      email,
      timestamp: Date.now()
    },
    JWT_SECRET,
    { expiresIn }
  );
};

// Verify JWT token middleware
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        code: 'TOKEN_MISSING' 
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ 
        error: 'User no longer exists',
        code: 'USER_NOT_FOUND' 
      });
    }

    // Add user info to request
    req.user = {
      id: decoded.userId,
      _id: decoded.userId,
      email: decoded.email
    };
    
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'TOKEN_EXPIRED' 
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'TOKEN_INVALID' 
      });
    }

    return res.status(500).json({ 
      error: 'Token verification failed',
      code: 'TOKEN_VERIFICATION_FAILED' 
    });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        req.user = {
          id: decoded.userId,
          email: decoded.email
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

// Role-based authorization
export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'AUTH_REQUIRED' 
      });
    }

    // For now, we'll implement basic roles
    // This can be extended based on your user model
    const userRole = req.user.role || 'user';
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS' 
      });
    }

    next();
  };
};

// Meeting access control
export const validateMeetingAccess = async (req, res, next) => {
  try {
    const { meetingId } = req.params;
    const { id: userId } = req.user;

    // Import Meeting model (avoid circular imports)
    const Meeting = (await import('../models/meeting.js')).default;
    
    const meeting = await Meeting.findOne({ 
      $or: [
        { meetingId },
        { _id: meetingId }
      ]
    });

    if (!meeting) {
      return res.status(404).json({ 
        error: 'Meeting not found',
        code: 'MEETING_NOT_FOUND' 
      });
    }

    // Check if user has access to this meeting
    const hasAccess = 
      meeting.creator === req.user.email || 
      meeting.participants.includes(req.user.email);

    if (!hasAccess) {
      return res.status(403).json({ 
        error: 'Access denied to this meeting',
        code: 'MEETING_ACCESS_DENIED' 
      });
    }

    req.meeting = meeting;
    next();
  } catch (error) {
    console.error('Meeting access validation error:', error);
    return res.status(500).json({ 
      error: 'Failed to validate meeting access',
      code: 'MEETING_ACCESS_VALIDATION_FAILED' 
    });
  }
};

// Rate limiting for sensitive operations
export const rateLimit = (maxRequests = 10, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const identifier = req.user?.id || req.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old requests
    if (requests.has(identifier)) {
      const userRequests = requests.get(identifier);
      const validRequests = userRequests.filter(time => time > windowStart);
      requests.set(identifier, validRequests);
    }

    // Check current request count
    const currentRequests = requests.get(identifier) || [];
    
    if (currentRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Add current request
    currentRequests.push(now);
    requests.set(identifier, currentRequests);

    next();
  };
};