import User from "../models/user.js";
import TempOtp from "../models/tempOtp.js";
import { sendEmail } from "../utils/sendemail.js";
import bcrypt from "bcryptjs";
import logger from "../utils/logger.js";
import { generateToken } from "../middleware/auth.js";

// Password strength validation
const validatePasswordStrength = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasNonalphas = /\W/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!hasLowerCase) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!hasNumbers) {
    errors.push("Password must contain at least one number");
  }
  if (!hasNonalphas) {
    errors.push("Password must contain at least one special character");
  }
  
  return errors;
};

// Email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const requestOtp = async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email) {
      return res.status(400).json({ 
        error: "Email is required",
        code: "EMAIL_REQUIRED"
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ 
        error: "Please enter a valid email address",
        code: "INVALID_EMAIL_FORMAT"
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.password && existingUser.emailVerified) {
      return res.status(400).json({ 
        error: "User already exists. Please login instead.",
        code: "USER_ALREADY_EXISTS"
      });
    }

    // Generate OTP and store temporarily (don't create user yet)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Store OTP temporarily - will create user only after verification
    await TempOtp.findOneAndUpdate(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otp,
        otpExpires,
        attempts: 0
      },
      { upsert: true, new: true }
    );

    // Try to send email
    try {
      const emailSubject = "Welcome to JointRight - Verify Your Email";
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Welcome to JointRight! 🚀</h2>
          <p>Thank you for signing up. Please use the following verification code to complete your registration:</p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1e293b; font-size: 32px; letter-spacing: 4px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #64748b;">This code will expire in 5 minutes for security reasons.</p>
          <p style="color: #64748b;">If you didn't request this code, please ignore this email.</p>
        </div>
      `;
      
      await sendEmail(normalizedEmail, emailSubject, emailBody);
      
      logger.info(`OTP sent successfully to ${normalizedEmail}`);
      
      res.json({ 
        success: true,
        message: "Verification code sent to your email",
        email: normalizedEmail
      });
    } catch (emailError) {
      logger.error('Email sending failed:', emailError);
      
      // For development, return OTP in response if email fails
      if (process.env.NODE_ENV === 'development') {
        return res.json({ 
          success: true,
          message: "Verification code generated (email service unavailable)",
          email: normalizedEmail,
          developmentOtp: otp // Only for development!
        });
      }
      
      return res.status(500).json({ 
        error: "Failed to send verification email. Please try again.",
        code: "EMAIL_SEND_FAILED"
      });
    }
  } catch (error) {
    logger.error('OTP request error:', error);
    res.status(500).json({ 
      error: "Failed to process signup request",
      code: "SIGNUP_REQUEST_FAILED"
    });
  }
};

export const verifySignup = async (req, res) => {
  try {
    const { email, otp, password, confirmPassword, firstName, lastName } = req.body;

    // Input validation
    if (!email || !otp || !password || !confirmPassword) {
      return res.status(400).json({ 
        error: "Email, OTP, password, and confirmation are required",
        code: "MISSING_REQUIRED_FIELDS"
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ 
        error: "Please enter a valid email address",
        code: "INVALID_EMAIL_FORMAT"
      });
    }

    // Password confirmation check
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        error: "Passwords do not match",
        code: "PASSWORDS_MISMATCH"
      });
    }

    // Password strength validation
    const passwordErrors = validatePasswordStrength(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: "Password does not meet security requirements",
        details: passwordErrors,
        code: "WEAK_PASSWORD"
      });
    }

    // Find temporary OTP record and verify
    const tempOtpRecord = await TempOtp.findOne({ email: normalizedEmail });
    if (!tempOtpRecord) {
      return res.status(400).json({ 
        error: "No verification code found. Please request a new one.",
        code: "NO_OTP_FOUND"
      });
    }

    if (tempOtpRecord.otp !== otp.trim()) {
      // Increment attempts
      tempOtpRecord.attempts += 1;
      await tempOtpRecord.save();
      
      return res.status(400).json({ 
        error: "Invalid verification code",
        code: "INVALID_OTP",
        attemptsRemaining: Math.max(0, 5 - tempOtpRecord.attempts)
      });
    }

    if (tempOtpRecord.otpExpires < Date.now()) {
      return res.status(400).json({ 
        error: "Verification code has expired. Please request a new one.",
        code: "EXPIRED_OTP"
      });
    }

    // Check if user already exists (extra safety check)
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ 
        error: "User already exists. Please login instead.",
        code: "USER_ALREADY_EXISTS"
      });
    }

    // Hash password and create new user (only now after OTP verification)
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = new User({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: firstName?.trim() || '',
      lastName: lastName?.trim() || '',
      emailVerified: true,
      isActive: true,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await newUser.save();
    
    // Clean up temporary OTP record
    await TempOtp.deleteOne({ email: normalizedEmail });

    logger.info(`User successfully signed up: ${normalizedEmail}`);

    // Send welcome email
    try {
      const welcomeSubject = "Welcome to JointRight - Account Created! 🎉";
      const welcomeBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Welcome to JointRight! 🎉</h2>
          <p>Congratulations! Your account has been successfully created.</p>
          <p>You can now sign in and start using our platform for seamless video meetings.</p>
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1e293b; margin-top: 0;">What's next?</h3>
            <ul style="color: #64748b;">
              <li>Complete your profile setup</li>
              <li>Create your first meeting</li>
              <li>Invite team members</li>
            </ul>
          </div>
          <p>Thank you for choosing JointRight!</p>
        </div>
      `;
      
      await sendEmail(normalizedEmail, welcomeSubject, welcomeBody);
    } catch (emailError) {
      logger.error('Welcome email sending failed:', emailError);
      // Don't fail the signup if welcome email fails
    }

    // Generate JWT token for immediate login
    const token = generateToken(newUser._id, newUser.email);

    res.json({ 
      success: true,
      message: "Account created successfully! You are now logged in.",
      user: {
        id: newUser._id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        emailVerified: newUser.emailVerified,
        role: newUser.role
      },
      token
    });
  } catch (error) {
    logger.error('Signup verification error:', error);
    res.status(500).json({ 
      error: "Failed to complete signup",
      code: "SIGNUP_VERIFICATION_FAILED"
    });
  }
};

// Resend OTP endpoint
export const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        error: "Email is required",
        code: "EMAIL_REQUIRED"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({ 
        error: "Please enter a valid email address",
        code: "INVALID_EMAIL_FORMAT"
      });
    }

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser && existingUser.emailVerified) {
      return res.status(400).json({ 
        error: "Email already verified. Please sign in.",
        code: "EMAIL_ALREADY_VERIFIED"
      });
    }

    // Check if temporary OTP record exists
    const tempOtpRecord = await TempOtp.findOne({ email: normalizedEmail });
    if (!tempOtpRecord) {
      return res.status(400).json({ 
        error: "No signup request found. Please start signup process.",
        code: "NO_SIGNUP_FOUND"
      });
    }

    // Generate new OTP and update temporary record
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    tempOtpRecord.otp = otp;
    tempOtpRecord.otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    tempOtpRecord.attempts = 0; // Reset attempts
    await tempOtpRecord.save();

    // Send email with new OTP
    const emailSubject = "JointRight - New Verification Code";
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">New Verification Code</h2>
        <p>Here's your new verification code:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="color: #1e293b; font-size: 32px; letter-spacing: 4px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #64748b;">This code will expire in 5 minutes.</p>
      </div>
    `;

    await sendEmail(normalizedEmail, emailSubject, emailBody);

    res.json({ 
      success: true,
      message: "New verification code sent to your email"
    });
  } catch (error) {
    logger.error('Resend OTP error:', error);
    res.status(500).json({ 
      error: "Failed to resend verification code",
      code: "RESEND_OTP_FAILED"
    });
  }
};

