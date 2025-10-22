import express from "express";
import { requestLoginOtp, verifyLoginOtp, directLogin, logout, refreshToken } from "../controllers/logincontroller.js";
import { rateLimit, authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Rate limiting for login attempts
const loginRateLimit = rateLimit(10, 15 * 60 * 1000); // 10 attempts per 15 minutes
const otpRateLimit = rateLimit(5, 15 * 60 * 1000); // 5 OTP requests per 15 minutes

// Standard login endpoint
router.post("/", loginRateLimit, directLogin);

// Direct login without OTP (primary method - for backwards compatibility)
router.post("/direct", loginRateLimit, directLogin);

// OTP-based login (fallback/alternative method)
router.post("/request-otp", otpRateLimit, requestLoginOtp);
router.post("/verify", loginRateLimit, verifyLoginOtp);

// Logout (requires authentication)
router.post("/logout", authenticateToken, logout);

// Refresh token (requires authentication)
router.post("/refresh", authenticateToken, refreshToken);

export default router;
