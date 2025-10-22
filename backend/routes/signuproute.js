import express from "express";
import { requestOtp, verifySignup, resendOtp } from "../controllers/signupcontroller.js";
import { rateLimit } from "../middleware/auth.js";

const router = express.Router();

// Apply rate limiting to sensitive endpoints
const otpRateLimit = rateLimit(5, 15 * 60 * 1000); // 5 requests per 15 minutes
const signupRateLimit = rateLimit(3, 60 * 60 * 1000); // 3 requests per hour

router.post("/request-otp", otpRateLimit, requestOtp);
router.post("/resend-otp", otpRateLimit, resendOtp);
router.post("/verify", signupRateLimit, verifySignup);

export default router;
