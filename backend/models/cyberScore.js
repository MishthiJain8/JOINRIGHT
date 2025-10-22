import mongoose from "mongoose";

// Incident types for easy reference
export const incidentTypes = {
  DISRUPTIVE_BEHAVIOR: 'disruptive_behavior',
  INAPPROPRIATE_CONTENT: 'inappropriate_content',
  HARASSMENT: 'harassment',
  SPAM: 'spam',
  TECHNICAL_ABUSE: 'technical_abuse',
  EXCESSIVE_INTERRUPTION: 'excessive_interruption',
  INAPPROPRIATE_SCREEN_SHARE: 'inappropriate_screen_share',
  VERBAL_ABUSE: 'verbal_abuse',
  TROLLING: 'trolling'
};

const cyberScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  // Overall cyber score (0-100, starts at 85 for good standing)
  currentScore: { type: Number, default: 85, min: 0, max: 100 },
  
  // Detailed scoring breakdown
  behaviorMetrics: {
    respectfulCommunication: { type: Number, default: 100, min: 0, max: 100 },
    punctuality: { type: Number, default: 100, min: 0, max: 100 },
    followsGuidelines: { type: Number, default: 100, min: 0, max: 100 },
    technicalConduct: { type: Number, default: 100, min: 0, max: 100 },
    overallParticipation: { type: Number, default: 100, min: 0, max: 100 }
  },
  
  // Score history and incidents
  scoreHistory: [{
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting' },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    scoreChange: { type: Number }, // +/- points
    category: { 
      type: String, 
      enum: ['respectfulCommunication', 'punctuality', 'followsGuidelines', 'technicalConduct', 'overallParticipation'],
      required: true 
    },
    reason: { type: String, required: true },
    incidentType: {
      type: String,
      enum: ['positive', 'neutral', 'minor_violation', 'major_violation', 'severe_violation'],
      default: 'neutral'
    },
    timestamp: { type: Date, default: Date.now },
    evidence: {
      screenshots: [String],
      chatLogs: [String],
      notes: String
    }
  }],
  
  // Reputation levels and trust indicators
  reputationLevel: {
    type: String,
    enum: ['excellent', 'good', 'average', 'poor', 'banned'],
    default: 'average'
  },
  
  // Meeting statistics
  meetingStats: {
    totalMeetingsAttended: { type: Number, default: 0 },
    meetingsKickedFrom: { type: Number, default: 0 },
    meetingsBanned: { type: Number, default: 0 },
    averageStayDuration: { type: Number, default: 0 }, // in minutes
    hostFeedbackCount: { type: Number, default: 0 },
    positiveReviews: { type: Number, default: 0 },
    negativeReviews: { type: Number, default: 0 }
  },
  
  // Meeting join times for duration calculation
  meetingJoinTimes: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Restrictions and limitations
  restrictions: {
    temporaryBan: {
      isActive: { type: Boolean, default: false },
      bannedUntil: Date,
      reason: String,
      bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    permanentRestrictions: [{
      type: {
        type: String,
        enum: ['microphone_disabled', 'camera_disabled', 'chat_disabled', 'screen_share_disabled']
      },
      reason: String,
      appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      appliedAt: { type: Date, default: Date.now }
    }]
  },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Calculate reputation level based on current score (0-100)
cyberScoreSchema.methods.updateReputationLevel = function() {
  if (this.currentScore >= 85) {
    this.reputationLevel = 'excellent';
  } else if (this.currentScore >= 70) {
    this.reputationLevel = 'good';
  } else if (this.currentScore >= 50) {
    this.reputationLevel = 'average';
  } else if (this.currentScore >= 25) {
    this.reputationLevel = 'poor';
  } else {
    this.reputationLevel = 'banned';
  }
};

// Add score change and update metrics
cyberScoreSchema.methods.addScoreChange = function(scoreData) {
  const { meetingId, hostId, scoreChange, category, reason, incidentType, evidence } = scoreData;
  
  // Convert meetingId to ObjectId if it's a string, or set to null if invalid
  let meetingObjectId = meetingId;
  if (typeof meetingId === 'string' && meetingId.length === 24) {
    try {
      meetingObjectId = new this.constructor.base.Types.ObjectId(meetingId);
    } catch (error) {
      console.warn('Invalid meetingId format, setting to null:', meetingId);
      meetingObjectId = null;
    }
  } else if (typeof meetingId === 'string') {
    // For non-ObjectId format strings (like "JPZ-457-RIV"), set to null
    console.warn('MeetingId is not in ObjectId format, setting to null:', meetingId);
    meetingObjectId = null;
  }
  
  // Add to history
  this.scoreHistory.push({
    meetingId: meetingObjectId,
    hostId,
    scoreChange,
    category,
    reason,
    incidentType,
    evidence
  });
  
  // Update category-specific score
  if (this.behaviorMetrics[category] !== undefined) {
    this.behaviorMetrics[category] = Math.max(0, Math.min(100, this.behaviorMetrics[category] + scoreChange));
  }
  
  // Update current score directly (same as addIncident method for consistency)
  this.currentScore = Math.max(0, Math.min(100, this.currentScore + scoreChange));
  
  // Update reputation level
  this.updateReputationLevel();
  
  // Update meeting stats
  if (incidentType === 'positive') {
    this.meetingStats.positiveReviews += 1;
  } else if (['minor_violation', 'major_violation', 'severe_violation'].includes(incidentType)) {
    this.meetingStats.negativeReviews += 1;
  }
  
  this.updatedAt = new Date();
};

// Check if user is currently restricted
cyberScoreSchema.methods.isCurrentlyRestricted = function() {
  const tempBan = this.restrictions.temporaryBan;
  if (tempBan.isActive && tempBan.bannedUntil && new Date() < tempBan.bannedUntil) {
    return true;
  }
  return this.reputationLevel === 'banned';
};

// Get trust level for hosts to see
cyberScoreSchema.methods.getTrustIndicator = function() {
  return {
    score: this.currentScore,
    level: this.reputationLevel,
    totalMeetings: this.meetingStats.totalMeetingsAttended,
    positiveReviews: this.meetingStats.positiveReviews,
    negativeReviews: this.meetingStats.negativeReviews,
    isRestricted: this.isCurrentlyRestricted(),
    lastIncident: this.scoreHistory.length > 0 ? this.scoreHistory[this.scoreHistory.length - 1] : null
  };
};

// Add method to rate a user and deduct points
cyberScoreSchema.methods.addIncident = function(incidentData) {
  const { hostId, hostName, meetingId, incidentType, reason, pointsDeducted, severity = 'minor' } = incidentData;
  
  // Map severity to schema incident type
  const severityToIncidentType = {
    'minor': 'minor_violation',
    'moderate': 'major_violation', 
    'major': 'severe_violation',
    'severe': 'severe_violation'
  };
  
  const schemaIncidentType = severityToIncidentType[severity] || 'minor_violation';
  
  // Convert meetingId to ObjectId if it's a string, or set to null if invalid
  let meetingObjectId = meetingId;
  if (typeof meetingId === 'string' && meetingId.length === 24) {
    try {
      meetingObjectId = new this.constructor.base.Types.ObjectId(meetingId);
    } catch (error) {
      console.warn('Invalid meetingId format in incident, setting to null:', meetingId);
      meetingObjectId = null;
    }
  } else if (typeof meetingId === 'string') {
    // For non-ObjectId format strings (like "JPZ-457-RIV"), set to null
    console.warn('MeetingId is not in ObjectId format in incident, setting to null:', meetingId);
    meetingObjectId = null;
  }
  
  // Add incident to history
  this.scoreHistory.push({
    meetingId: meetingObjectId,
    hostId,
    scoreChange: -pointsDeducted,
    category: 'overallParticipation',
    reason,
    incidentType: schemaIncidentType
  });
  
  // Deduct points from current score
  this.currentScore = Math.max(0, this.currentScore - pointsDeducted);
  
  // Update reputation level
  this.updateReputationLevel();
  
  // Update meeting stats
  this.meetingStats.negativeReviews += 1;
  this.updatedAt = new Date();
};

// Static method to get score level configurations
cyberScoreSchema.statics.getScoreLevels = function() {
  return {
    excellent: { min: 85, max: 100, color: '#10B981', label: 'Excellent', icon: '🌟' },
    good: { min: 70, max: 84, color: '#059669', label: 'Good', icon: '✅' },
    average: { min: 50, max: 69, color: '#F59E0B', label: 'Fair', icon: '⚠️' },
    poor: { min: 25, max: 49, color: '#EF4444', label: 'Poor', icon: '❌' },
    banned: { min: 0, max: 24, color: '#7F1D1D', label: 'Blocked', icon: '🚫' }
  };
};

// Add indexes for better query performance
cyberScoreSchema.index({ userId: 1 }); // Primary query field
cyberScoreSchema.index({ currentScore: -1 }); // For sorting by score
cyberScoreSchema.index({ reputationLevel: 1 }); // For filtering by level
cyberScoreSchema.index({ updatedAt: -1 }); // For recent updates
cyberScoreSchema.index({ 'scoreHistory.timestamp': -1 }); // For sorting reviews by date
cyberScoreSchema.index({ 'scoreHistory.hostId': 1 }); // For filtering by host
cyberScoreSchema.index({ 'scoreHistory.incidentType': 1 }); // For filtering by incident type
cyberScoreSchema.index({ 'meetingStats.totalMeetingsAttended': -1 }); // For user activity stats

export default mongoose.models.CyberScore || mongoose.model("CyberScore", cyberScoreSchema);
