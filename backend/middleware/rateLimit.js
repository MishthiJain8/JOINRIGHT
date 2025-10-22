import rateLimit from 'express-rate-limit';
import logger from '../utils/logger.js';

// Create rate limiting middleware
export { rateLimit };

// Default rate limit configuration
export const createRateLimit = (options = {}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Default limit of 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      error: 'Too many requests from this IP, please try again later',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, URL: ${req.url}`);
      res.status(429).json(options.message || {
        error: 'Too many requests from this IP, please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    },
    skip: (req) => {
      // Skip rate limiting in test environment
      return process.env.NODE_ENV === 'test';
    }
  };

  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

// Specific rate limiters for different endpoints
export const authRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Strict limit for auth endpoints
  message: {
    error: 'Too many authentication attempts from this IP, please try again later',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  }
});

export const adminRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // More generous for admin operations
  message: {
    error: 'Too many admin requests from this IP, please try again later',
    code: 'ADMIN_RATE_LIMIT_EXCEEDED'
  }
});

export const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // General API rate limit
  message: {
    error: 'Too many API requests from this IP, please try again later',
    code: 'API_RATE_LIMIT_EXCEEDED'
  }
});

// File upload rate limit (stricter due to resource usage)
export const uploadRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limited file uploads
  message: {
    error: 'Too many file upload attempts from this IP, please try again later',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  }
});

export default createRateLimit;