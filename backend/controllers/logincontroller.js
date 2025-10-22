import User from "../models/user.js";
import { sendEmail } from "../utils/sendemail.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../middleware/auth.js";
import logger from "../utils/logger.js";

// Email validation helper
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Account lockout constants
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 30 * 60 * 1000; // 30 minutes

// Direct login with enhanced security
export const directLogin = async (req, res) => {
  try {
    const { email, password, rememberMe = false } = req.body;
    const clientIp = req.ip || req.connection.remoteAddress;

    // Input validation
    if (!email || !password) {
      logger.warn(`Login attempt with missing credentials from IP: ${clientIp}`);
      return res.status(400).json({ 
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS"
      });
    }

    // Normalize and validate email
    const normalizedEmail = email.toLowerCase().trim();
    if (!isValidEmail(normalizedEmail)) {
      logger.warn(`Login attempt with invalid email format: ${email} from IP: ${clientIp}`);
      return res.status(400).json({ 
        error: "Please enter a valid email address",
        code: "INVALID_EMAIL_FORMAT"
      });
    }

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${normalizedEmail} from IP: ${clientIp}`);
      return res.status(404).json({ 
        error: "User not found",
        message: "No account found with this email address",
        code: "USER_NOT_FOUND"
      });
    }

    // Check if user account is active
    if (!user.isActive) {
      logger.warn(`Login attempt to deactivated account: ${normalizedEmail} from IP: ${clientIp}`);
      return res.status(403).json({ 
        error: "Account has been deactivated. Please contact support.",
        code: "ACCOUNT_DEACTIVATED"
      });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      logger.warn(`Login attempt to unverified account: ${normalizedEmail} from IP: ${clientIp}`);
      return res.status(403).json({ 
        error: "Please verify your email address before logging in",
        code: "EMAIL_NOT_VERIFIED"
      });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const remainingTime = Math.ceil((user.lockUntil - Date.now()) / 60000); // minutes
      logger.warn(`Login attempt to locked account: ${normalizedEmail} from IP: ${clientIp}`);
      return res.status(423).json({ 
        error: `Account is temporarily locked. Try again in ${remainingTime} minutes.`,
        code: "ACCOUNT_LOCKED",
        lockTime: remainingTime
      });
    }

    // Check if user has a password (some users might only have been created for OTP)
    if (!user.password) {
      logger.warn(`Login attempt to account without password: ${normalizedEmail} from IP: ${clientIp}`);
      return res.status(400).json({ 
        error: "Please complete your account setup first",
        code: "INCOMPLETE_ACCOUNT"
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      // Increment login attempts
      const updates = {
        loginAttempts: user.loginAttempts + 1,
        updatedAt: new Date()
      };
      
      // Lock account if too many failed attempts
      if (user.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
        updates.lockUntil = Date.now() + LOCK_TIME;
        logger.warn(`Account locked due to too many failed attempts: ${normalizedEmail} from IP: ${clientIp}`);
      }
      
      await User.findByIdAndUpdate(user._id, updates);
      
      logger.warn(`Failed login attempt ${user.loginAttempts + 1}/${MAX_LOGIN_ATTEMPTS} for: ${normalizedEmail} from IP: ${clientIp}`);
      
      if (updates.lockUntil) {
        return res.status(423).json({ 
          error: "Too many failed login attempts. Account has been temporarily locked.",
          code: "ACCOUNT_LOCKED_ATTEMPTS"
        });
      }
      
      const remainingAttempts = MAX_LOGIN_ATTEMPTS - (user.loginAttempts + 1);
      return res.status(401).json({ 
        error: "Wrong email or password",
        message: "The password you entered is incorrect",
        code: "INVALID_PASSWORD",
        remainingAttempts: remainingAttempts > 0 ? remainingAttempts : 0
      });
    }

    // Successful login - reset login attempts and update last login
    const updateData = {
      loginAttempts: 0,
      lockUntil: null,
      lastLogin: new Date(),
      updatedAt: new Date()
    };
    
    await User.findByIdAndUpdate(user._id, updateData);

    // Generate JWT token with appropriate expiry
    const tokenExpiry = rememberMe ? '30d' : '24h';
    const token = generateToken(user._id, user.email, tokenExpiry);

    logger.info(`Successful login for: ${normalizedEmail} from IP: ${clientIp}`);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: updateData.lastLogin,
        preferences: user.preferences
      },
      token,
      expiresIn: tokenExpiry
    });
  } catch (error) {
    logger.error('Direct login error:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: "Login failed. Please try again.",
      code: "LOGIN_FAILED"
    });
  }
};

export const requestLoginOtp = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: "Email and password are required",
        code: "MISSING_CREDENTIALS"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        error: "User not found",
        message: "No account found with this email address",
        code: "USER_NOT_FOUND"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ 
        error: "Wrong email or password",
        message: "The password you entered is incorrect",
        code: "INVALID_PASSWORD"
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    // Try to send email, but don't fail if email service is unavailable
    try {
      const emailSubject = "JointRight - Login Verification Code";
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Login Verification Required 🔐</h2>
          <p>Here's your one-time login verification code:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1e293b; font-size: 32px; letter-spacing: 4px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #64748b;">This code will expire in 5 minutes for security reasons.</p>
          <p style="color: #64748b;">If you didn't request this code, please secure your account immediately.</p>
        </div>
      `;
      await sendEmail(email, emailSubject, emailBody);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      // For development, you might want to return the OTP in response
      // Remove this in production!
      if (process.env.NODE_ENV === 'development') {
        return res.json({ 
          message: "OTP generated (email service unavailable)",
          otp // Only for development!
        });
      }
    }

    res.json({ 
      success: true,
      message: "OTP sent to your email"
    });
  } catch (error) {
    console.error('OTP request error:', error);
    res.status(500).json({ 
      error: "Failed to send OTP",
      code: "OTP_REQUEST_FAILED"
    });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ 
        error: "Email and OTP are required",
        code: "MISSING_OTP_DATA"
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ 
        error: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(401).json({ 
        error: "Invalid or expired OTP",
        code: "INVALID_OTP"
      });
    }

    // Clear OTP and update last login
    user.otp = null;
    user.otpExpires = null;
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken(user._id, user.email);

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      error: "OTP verification failed",
      code: "OTP_VERIFICATION_FAILED"
    });
  }
};

// Logout endpoint to blacklist token (optional)
export const logout = async (req, res) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      error: "Logout failed",
      code: "LOGOUT_FAILED"
    });
  }
};

// Refresh token endpoint
export const refreshToken = async (req, res) => {
  try {
    const { user } = req; // From auth middleware
    
    console.log('Refresh token request for user:', { id: user._id || user.id, email: user.email });
    
    const newToken = generateToken(user._id || user.id, user.email);
    
    res.json({
      success: true,
      token: newToken
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ 
      error: "Token refresh failed",
      code: "TOKEN_REFRESH_FAILED"
    });
  }
};

