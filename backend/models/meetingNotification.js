import mongoose from "mongoose";

const meetingNotificationSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Notification details
  type: {
    type: String,
    enum: ['meeting_reminder', 'meeting_started', 'meeting_invitation', 'meeting_cancelled'],
    required: true
  },
  
  title: { type: String, required: true },
  message: { type: String, required: true },
  
  // Reminder timing (optional)
  reminderTime: { type: Date }, // When to send the reminder
  scheduledMeetingTime: { type: Date }, // The meeting time (for context)
  
  // Notification status
  status: {
    type: String,
    enum: ['pending', 'sent', 'read', 'dismissed'],
    default: 'pending'
  },
  
  sentAt: { type: Date },
  readAt: { type: Date },
  dismissedAt: { type: Date },
  
  // Delivery channels
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  
  // Additional data
  meetingDetails: {
    meetingTitle: String,
    meetingId: String,
    hostName: String,
    meetingLink: String
  },
  
  // Retry logic for failed deliveries
  deliveryAttempts: { type: Number, default: 0 },
  lastDeliveryAttempt: { type: Date },
  deliveryError: { type: String },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Mark notification as sent
meetingNotificationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  this.updatedAt = new Date();
};

// Mark notification as read
meetingNotificationSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  this.updatedAt = new Date();
};

// Mark notification as dismissed
meetingNotificationSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  this.dismissedAt = new Date();
  this.updatedAt = new Date();
};

// Check if notification should be sent now
meetingNotificationSchema.methods.shouldBeSent = function() {
  if (this.status !== 'pending') return false;
  if (!this.reminderTime) return true; // Send immediately if no specific time
  return new Date() >= this.reminderTime;
};

// Increment delivery attempt
meetingNotificationSchema.methods.recordDeliveryAttempt = function(error = null) {
  this.deliveryAttempts += 1;
  this.lastDeliveryAttempt = new Date();
  this.deliveryError = error;
  this.updatedAt = new Date();
};

// Static method to create meeting reminder notifications
meetingNotificationSchema.statics.createMeetingReminders = async function(meeting, participants) {
  const notifications = [];
  
  if (!meeting.scheduledAt) {
    // No scheduled time, no reminders needed
    return notifications;
  }
  
  for (const participantEmail of participants) {
    const participant = await mongoose.model('User').findOne({ email: participantEmail });
    if (!participant) continue;
    
    // Create reminder 15 minutes before meeting
    const fifteenMinutesBefore = new Date(meeting.scheduledAt.getTime() - 15 * 60 * 1000);
    
    if (fifteenMinutesBefore > new Date()) { // Only if it's in the future
      const notification = new this({
        meetingId: meeting._id,
        userId: participant._id,
        type: 'meeting_reminder',
        title: `Meeting Reminder: ${meeting.title}`,
        message: `You have a meeting "${meeting.title}" scheduled at ${meeting.scheduledAt.toLocaleString()}`,
        reminderTime: fifteenMinutesBefore,
        scheduledMeetingTime: meeting.scheduledAt,
        meetingDetails: {
          meetingTitle: meeting.title,
          meetingId: meeting.meetingId,
          hostName: meeting.creator,
          meetingLink: meeting.link
        }
      });
      
      notifications.push(notification);
    }
  }
  
  return notifications;
};

// Indexes for better performance
meetingNotificationSchema.index({ userId: 1, status: 1 });
meetingNotificationSchema.index({ reminderTime: 1, status: 1 });
meetingNotificationSchema.index({ meetingId: 1 });

export default mongoose.model("MeetingNotification", meetingNotificationSchema);