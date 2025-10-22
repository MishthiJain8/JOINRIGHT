import mongoose from 'mongoose';

const contactMessageSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 255
  },
  subject: {
    type: String,
    required: true,
    enum: [
      'technical-support',
      'billing',
      'feature-request',
      'partnership',
      'general'
    ]
  },
  message: {
    type: String,
    required: true,
    maxlength: 2000
  },
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'resolved'],
    default: 'new'
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  adminNotes: {
    type: String,
    maxlength: 1000
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// Update lastUpdated field before saving
contactMessageSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  next();
});

// Index for efficient querying
contactMessageSchema.index({ submittedAt: -1 });
contactMessageSchema.index({ status: 1 });

export default mongoose.model('ContactMessage', contactMessageSchema);
