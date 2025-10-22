import mongoose from "mongoose";

const meetingParticipantSchema = new mongoose.Schema({
  meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Participant status and permissions
  status: {
    type: String,
    enum: ['waiting', 'approved', 'denied', 'joined', 'left', 'kicked', 'banned'],
    default: 'waiting'
  },
  
  // Join request information
  joinRequest: {
    requestedAt: { type: Date, default: Date.now },
    userAgent: String,
    ipAddress: String,
    deviceInfo: {
      platform: String,
      browser: String,
      version: String
    }
  },
  
  // Host decisions and actions
  hostActions: [{
    action: {
      type: String,
      enum: ['approved', 'denied', 'kicked', 'banned', 'muted', 'unmuted', 'video_disabled', 'video_enabled', 'promoted_to_cohost']
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    performedAt: { type: Date, default: Date.now },
    reason: String,
    notes: String
  }],
  
  // Current permissions within the meeting
  permissions: {
    canUseAudio: { type: Boolean, default: true },
    canUseVideo: { type: Boolean, default: true },
    canShareScreen: { type: Boolean, default: true },
    canChat: { type: Boolean, default: true },
    canUseWhiteboard: { type: Boolean, default: true },
    canRecordMeeting: { type: Boolean, default: false },
    isCoHost: { type: Boolean, default: false }
  },
  
  // Meeting session tracking
  sessionData: {
    joinedAt: Date,
    leftAt: Date,
    totalDuration: { type: Number, default: 0 }, // in minutes
    disconnectionCount: { type: Number, default: 0 },
    lastHeartbeat: Date,
    
    // Activity tracking
    activities: [{
      type: {
        type: String,
        enum: ['joined', 'left', 'audio_on', 'audio_off', 'video_on', 'video_off', 'screen_share_start', 'screen_share_stop', 'chat_message', 'disconnected', 'reconnected']
      },
      timestamp: { type: Date, default: Date.now },
      data: mongoose.Schema.Types.Mixed // Additional data specific to the activity
    }]
  },
  
  // Host feedback and scoring for this specific meeting
  hostFeedback: {
    behaviorRating: {
      respectfulCommunication: { type: Number, min: 1, max: 5 },
      punctuality: { type: Number, min: 1, max: 5 },
      followsGuidelines: { type: Number, min: 1, max: 5 },
      technicalConduct: { type: Number, min: 1, max: 5 },
      overallParticipation: { type: Number, min: 1, max: 5 }
    },
    comments: String,
    recommended: { type: Boolean }, // Would host recommend this participant to other hosts?
    ratedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ratedAt: Date
  },
  
  // Cyber score at the time of joining (for host visibility)
  cyberScoreSnapshot: {
    score: Number,
    level: String,
    totalMeetings: Number,
    positiveReviews: Number,
    negativeReviews: Number,
    lastIncidentDate: Date,
    snapshotTakenAt: { type: Date, default: Date.now }
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Add activity to session data
meetingParticipantSchema.methods.addActivity = function(activityType, data = null) {
  this.sessionData.activities.push({
    type: activityType,
    timestamp: new Date(),
    data: data
  });
  
  // Update session tracking based on activity
  switch (activityType) {
    case 'joined':
      this.sessionData.joinedAt = new Date();
      this.status = 'joined';
      break;
    case 'left':
      this.sessionData.leftAt = new Date();
      this.status = 'left';
      if (this.sessionData.joinedAt) {
        const duration = Math.round((new Date() - this.sessionData.joinedAt) / (1000 * 60));
        this.sessionData.totalDuration += duration;
      }
      break;
    case 'disconnected':
      this.sessionData.disconnectionCount += 1;
      break;
  }
  
  this.sessionData.lastHeartbeat = new Date();
  this.updatedAt = new Date();
};

// Check if participant is currently active in meeting
meetingParticipantSchema.methods.isActive = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.status === 'joined' && 
         this.sessionData.lastHeartbeat && 
         this.sessionData.lastHeartbeat > fiveMinutesAgo;
};

// Get participant summary for host
meetingParticipantSchema.methods.getHostSummary = function() {
  return {
    userId: this.userId,
    status: this.status,
    cyberScore: this.cyberScoreSnapshot,
    joinRequestTime: this.joinRequest.requestedAt,
    sessionDuration: this.sessionData.totalDuration,
    permissions: this.permissions,
    isActive: this.isActive(),
    disconnectionCount: this.sessionData.disconnectionCount,
    lastActivity: this.sessionData.activities.length > 0 
      ? this.sessionData.activities[this.sessionData.activities.length - 1] 
      : null
  };
};

// Add host action
meetingParticipantSchema.methods.addHostAction = function(action, performedBy, reason = null, notes = null) {
  this.hostActions.push({
    action,
    performedBy,
    reason,
    notes,
    performedAt: new Date()
  });
  
  // Update status and permissions based on action
  switch (action) {
    case 'approved':
      this.status = 'approved';
      break;
    case 'denied':
      this.status = 'denied';
      break;
    case 'kicked':
      this.status = 'kicked';
      this.addActivity('left', { reason: 'kicked_by_host' });
      break;
    case 'banned':
      this.status = 'banned';
      this.addActivity('left', { reason: 'banned_by_host' });
      break;
    case 'muted':
      this.permissions.canUseAudio = false;
      break;
    case 'unmuted':
      this.permissions.canUseAudio = true;
      break;
    case 'video_disabled':
      this.permissions.canUseVideo = false;
      break;
    case 'video_enabled':
      this.permissions.canUseVideo = true;
      break;
    case 'promoted_to_cohost':
      this.permissions.isCoHost = true;
      this.permissions.canRecordMeeting = true;
      break;
  }
  
  this.updatedAt = new Date();
};

// Indexes for better query performance
meetingParticipantSchema.index({ meetingId: 1, userId: 1 }, { unique: true });
meetingParticipantSchema.index({ meetingId: 1, status: 1 });
meetingParticipantSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("MeetingParticipant", meetingParticipantSchema);