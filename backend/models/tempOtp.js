import mongoose from 'mongoose';

const tempOtpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  otp: {
    type: String,
    required: true
  },
  otpExpires: {
    type: Date,
    required: true
  },
  attempts: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 1800 // 30 minutes - auto-delete expired temp OTPs
  }
});

// Index for faster lookups and automatic cleanup
tempOtpSchema.index({ email: 1 });
tempOtpSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('TempOtp', tempOtpSchema);