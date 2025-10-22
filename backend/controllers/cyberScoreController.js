import CyberScore, { incidentTypes } from '../models/CyberScore.js';
import User from '../models/user.js';
import MeetingAnalyticsService from '../services/meetingAnalyticsService.js';

// Get user's cyber score
export const getUserCyberScore = async (req, res) => {
  try {
    const { userId } = req.params;
    
    let cyberScore = await CyberScore.findOne({ userId }).populate('userId', 'firstName lastName email');
    
    // Create default cyber score if doesn't exist
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId });
      await cyberScore.save();
      
      // Update user reference
      await User.findByIdAndUpdate(userId, { cyberScore: cyberScore._id });
    }
    
    res.json({
      success: true,
      cyberScore: {
        userId: cyberScore.userId,
        currentScore: cyberScore.currentScore,
        reputationLevel: cyberScore.reputationLevel,
        meetingStats: cyberScore.meetingStats,
        restrictions: cyberScore.restrictions,
        lastUpdated: cyberScore.updatedAt
      }
    });
  } catch (error) {
    console.error('Error fetching cyber score:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cyber score' });
  }
};

// Get user's cyber score for other hosts to see (limited info)
export const getUserTrustIndicator = async (req, res) => {
  try {
    const { userId } = req.params;
    
    let cyberScore = await CyberScore.findOne({ userId }).populate('userId', 'firstName lastName');
    
    // Create default cyber score if doesn't exist
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId });
      await cyberScore.save();
    }
    
    const trustIndicator = cyberScore.getTrustIndicator();
    
    res.json({
      success: true,
      trustIndicator: {
        ...trustIndicator,
        userName: cyberScore.userId?.firstName + ' ' + cyberScore.userId?.lastName || 'User'
      }
    });
  } catch (error) {
    console.error('Error fetching trust indicator:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trust indicator' });
  }
};

// Rate a user (host only)
export const rateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { hostId, meetingId, incidentType, reason, pointsDeducted, severity = 'minor' } = req.body;
    
    // Validate input
    if (!hostId || !meetingId || !incidentType || !reason || !pointsDeducted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: hostId, meetingId, incidentType, reason, pointsDeducted' 
      });
    }
    
    // Validate incident type
    if (!Object.values(incidentTypes).includes(incidentType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid incident type' 
      });
    }
    
    // Validate points deducted
    if (pointsDeducted < 1 || pointsDeducted > 50) {
      return res.status(400).json({ 
        success: false, 
        message: 'Points deducted must be between 1 and 50' 
      });
    }
    
    // Get host information
    const host = await User.findById(hostId).select('firstName lastName');
    if (!host) {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }
    
    // Get or create cyber score for the user being rated
    let cyberScore = await CyberScore.findOne({ userId });
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId });
    }
    
    // Store previous score for response
    const previousScore = cyberScore.currentScore;
    
    // Add the incident
    cyberScore.addIncident({
      hostId,
      hostName: `${host.firstName} ${host.lastName}`,
      meetingId,
      incidentType,
      reason,
      pointsDeducted,
      severity
    });
    
    // Update meeting statistics based on the rating
    const isPositiveReview = pointsDeducted <= 5 && (severity === 'minor' || severity === 'positive');
    await MeetingAnalyticsService.updateReviewStats(userId, isPositiveReview);
    
    await cyberScore.save();
    
    // Get updated meeting stats for response
    const updatedStats = await MeetingAnalyticsService.getMeetingStats(userId);
    
    // Emit real-time update for cyber score change
    const io = req.app.get('io');
    if (io) {
      const updateData = {
        userId,
        previousScore,
        newScore: cyberScore.currentScore,
        pointsChanged: -pointsDeducted,
        reason,
        reputationLevel: cyberScore.reputationLevel,
        meetingStats: updatedStats,
        timestamp: new Date()
      };
      
      // Emit to user-specific room
      io.to(`cyber-score-${userId}`).emit('cyber-score-updated', updateData);
      
      // Also emit new incident event
      io.to(`cyber-score-${userId}`).emit('new-incident', {
        userId,
        incidentType,
        reason,
        pointsDeducted,
        severity,
        hostName: `${host.firstName} ${host.lastName}`,
        timestamp: new Date()
      });
      
      // Emit meeting stats update
      io.to(`cyber-score-${userId}`).emit('meeting-stats-updated', {
        userId,
        meetingStats: updatedStats,
        timestamp: new Date()
      });
      
      console.log(`Emitted real-time cyber score and meeting stats update for user ${userId}`);
    }
    
    res.json({
      success: true,
      message: 'User rated successfully',
      result: {
        previousScore,
        newScore: cyberScore.currentScore,
        pointsDeducted,
        reputationLevel: cyberScore.reputationLevel,
        meetingStats: updatedStats
      }
    });
  } catch (error) {
    console.error('Error rating user:', error);
    res.status(500).json({ success: false, message: 'Failed to rate user' });
  }
};

// Award positive review to increase user's cyber score (host only)
export const awardPositiveReview = async (req, res) => {
  try {
    const { userId } = req.params;
    const { hostId, meetingId, awardType, reason, pointsAwarded, comments } = req.body;
    
    // Validate input
    if (!hostId || !meetingId || !awardType || !reason || !pointsAwarded) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: hostId, meetingId, awardType, reason, pointsAwarded' 
      });
    }
    
    // Validate award type
    const validAwardTypes = ['excellent_participation', 'helpful_contribution', 'leadership', 'technical_assistance', 'positive_attitude', 'problem_solving', 'collaborative_spirit'];
    if (!validAwardTypes.includes(awardType)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid award type' 
      });
    }
    
    // Validate points awarded (1-25 points for positive reviews)
    if (pointsAwarded < 1 || pointsAwarded > 25) {
      return res.status(400).json({ 
        success: false, 
        message: 'Points awarded must be between 1 and 25' 
      });
    }
    
    // Get host information
    const host = await User.findById(hostId).select('firstName lastName');
    if (!host) {
      return res.status(404).json({ success: false, message: 'Host not found' });
    }
    
    // Get or create cyber score for the user being awarded
    let cyberScore = await CyberScore.findOne({ userId });
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId });
    }
    
    // Store previous score for response
    const previousScore = cyberScore.currentScore;
    
    // Add positive score change using addScoreChange method
    cyberScore.addScoreChange({
      meetingId,
      hostId,
      scoreChange: pointsAwarded,
      category: 'overallParticipation', // Default category for awards
      reason: `${getAwardLabel(awardType)}: ${reason}`,
      incidentType: 'positive',
      evidence: {
        notes: comments || '',
        awardType: awardType
      }
    });
    
    // Update meeting statistics for positive review
    await MeetingAnalyticsService.updateReviewStats(userId, true);
    
    await cyberScore.save();
    
    // Get updated meeting stats for response
    const updatedStats = await MeetingAnalyticsService.getMeetingStats(userId);
    
    // Emit real-time update for positive cyber score change
    const io = req.app.get('io');
    if (io) {
      const updateData = {
        userId,
        previousScore,
        newScore: cyberScore.currentScore,
        pointsChanged: pointsAwarded,
        reason: `${getAwardLabel(awardType)}: ${reason}`,
        reputationLevel: cyberScore.reputationLevel,
        meetingStats: updatedStats,
        timestamp: new Date()
      };
      
      // Emit to user-specific room
      io.to(`cyber-score-${userId}`).emit('cyber-score-updated', updateData);
      
      // Also emit positive award event
      io.to(`cyber-score-${userId}`).emit('positive-award', {
        userId,
        awardType,
        reason,
        pointsAwarded,
        hostName: `${host.firstName} ${host.lastName}`,
        comments,
        timestamp: new Date()
      });
      
      // Emit meeting stats update
      io.to(`cyber-score-${userId}`).emit('meeting-stats-updated', {
        userId,
        meetingStats: updatedStats,
        timestamp: new Date()
      });
      
      console.log(`Emitted real-time positive award update for user ${userId}`);
    }
    
    res.json({
      success: true,
      message: 'Positive review awarded successfully',
      result: {
        previousScore,
        newScore: cyberScore.currentScore,
        pointsAwarded,
        reputationLevel: cyberScore.reputationLevel,
        awardType,
        meetingStats: updatedStats
      }
    });
  } catch (error) {
    console.error('Error awarding positive review:', error);
    res.status(500).json({ success: false, message: 'Failed to award positive review' });
  }
};

// Helper function to get award label
function getAwardLabel(awardType) {
  const labels = {
    excellent_participation: 'Excellent Participation',
    helpful_contribution: 'Helpful Contribution',
    leadership: 'Leadership Skills',
    technical_assistance: 'Technical Assistance',
    positive_attitude: 'Positive Attitude',
    problem_solving: 'Problem Solving',
    collaborative_spirit: 'Collaborative Spirit'
  };
  return labels[awardType] || 'Positive Review';
}

// Get available award types for positive reviews
export const getAwardTypes = async (req, res) => {
  try {
    const types = {
      excellent_participation: {
        label: 'Excellent Participation',
        description: 'Active and meaningful participation throughout the meeting',
        defaultPoints: 5,
        color: '#10b981',
        icon: '🌟'
      },
      helpful_contribution: {
        label: 'Helpful Contribution',
        description: 'Provided valuable insights or helpful suggestions',
        defaultPoints: 7,
        color: '#3b82f6',
        icon: '💡'
      },
      leadership: {
        label: 'Leadership Skills',
        description: 'Demonstrated leadership qualities and guided discussions',
        defaultPoints: 10,
        color: '#8b5cf6',
        icon: '👑'
      },
      technical_assistance: {
        label: 'Technical Assistance',
        description: 'Helped others with technical issues or shared expertise',
        defaultPoints: 8,
        color: '#06b6d4',
        icon: '⚙️'
      },
      positive_attitude: {
        label: 'Positive Attitude',
        description: 'Maintained a positive and encouraging atmosphere',
        defaultPoints: 6,
        color: '#f59e0b',
        icon: '😊'
      },
      problem_solving: {
        label: 'Problem Solving',
        description: 'Effectively solved problems or helped resolve conflicts',
        defaultPoints: 9,
        color: '#ef4444',
        icon: '🧩'
      },
      collaborative_spirit: {
        label: 'Collaborative Spirit',
        description: 'Worked well with others and promoted team cooperation',
        defaultPoints: 6,
        color: '#84cc16',
        icon: '🤝'
      }
    };
    
    res.json({
      success: true,
      awardTypes: types
    });
  } catch (error) {
    console.error('Error fetching award types:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch award types' });
  }
};

// Get user's incident history (for profile page)
export const getUserIncidentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, type = 'all' } = req.query; // Add type filter
    
    const cyberScore = await CyberScore.findOne({ userId }).populate({
      path: 'scoreHistory.hostId',
      select: 'firstName lastName'
    });
    
    if (!cyberScore) {
      return res.json({
        success: true,
        history: [],
        totalItems: 0,
        currentScore: 85,
        reputationLevel: 'good',
        summary: {
          totalReviews: 0,
          positiveReviews: 0,
          negativeReviews: 0
        }
      });
    }
    
    // Sort by most recent first
    let sortedHistory = cyberScore.scoreHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Filter by type if specified
    if (type === 'positive') {
      sortedHistory = sortedHistory.filter(item => item.incidentType === 'positive');
    } else if (type === 'negative') {
      sortedHistory = sortedHistory.filter(item => ['minor_violation', 'major_violation', 'severe_violation'].includes(item.incidentType));
    }
    
    // Enhanced history items with better formatting (no host names for privacy)
    const enhancedHistory = sortedHistory.map(item => {
      const itemObj = item.toObject ? item.toObject() : item;
      return {
        _id: itemObj._id,
        scoreChange: itemObj.scoreChange,
        category: itemObj.category,
        reason: itemObj.reason,
        incidentType: itemObj.incidentType,
        timestamp: itemObj.timestamp,
        isPositive: itemObj.incidentType === 'positive',
        isNegative: ['minor_violation', 'major_violation', 'severe_violation'].includes(itemObj.incidentType),
        reviewType: itemObj.incidentType === 'positive' ? 'award' : 'incident',
        pointsDisplay: itemObj.scoreChange > 0 ? `+${itemObj.scoreChange}` : `${itemObj.scoreChange}`,
        formattedDate: new Date(itemObj.timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
        // Removed hostName and hostId for privacy
      };
    });
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedHistory = enhancedHistory.slice(startIndex, startIndex + limit);
    
    // Calculate summary statistics
    const totalReviews = cyberScore.scoreHistory.length;
    const positiveReviews = cyberScore.scoreHistory.filter(item => item.incidentType === 'positive').length;
    const negativeReviews = cyberScore.scoreHistory.filter(item => ['minor_violation', 'major_violation', 'severe_violation'].includes(item.incidentType)).length;
    
    res.json({
      success: true,
      history: paginatedHistory,
      totalItems: enhancedHistory.length,
      currentScore: cyberScore.currentScore,
      reputationLevel: cyberScore.reputationLevel,
      meetingStats: cyberScore.meetingStats,
      summary: {
        totalReviews,
        positiveReviews,
        negativeReviews,
        positivePercentage: totalReviews > 0 ? Math.round((positiveReviews / totalReviews) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching incident history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch incident history' });
  }
};

// Get available incident types
export const getIncidentTypes = async (req, res) => {
  try {
    const types = {
      [incidentTypes.DISRUPTIVE_BEHAVIOR]: {
        label: 'Disruptive Behavior',
        description: 'Interrupting, shouting, or causing disturbance',
        defaultPoints: 5,
        severity: 'minor'
      },
      [incidentTypes.INAPPROPRIATE_CONTENT]: {
        label: 'Inappropriate Content',
        description: 'Sharing offensive or inappropriate material',
        defaultPoints: 10,
        severity: 'moderate'
      },
      [incidentTypes.HARASSMENT]: {
        label: 'Harassment',
        description: 'Bullying, discrimination, or harassment of participants',
        defaultPoints: 20,
        severity: 'major'
      },
      [incidentTypes.SPAM]: {
        label: 'Spam/Flooding',
        description: 'Sending repetitive messages or flooding chat',
        defaultPoints: 8,
        severity: 'moderate'
      },
      [incidentTypes.TECHNICAL_ABUSE]: {
        label: 'Technical Abuse',
        description: 'Misusing meeting features or attempting to disrupt',
        defaultPoints: 15,
        severity: 'major'
      },
      [incidentTypes.EXCESSIVE_INTERRUPTION]: {
        label: 'Excessive Interruption',
        description: 'Constantly interrupting or disrupting conversation flow',
        defaultPoints: 6,
        severity: 'minor'
      },
      [incidentTypes.INAPPROPRIATE_SCREEN_SHARE]: {
        label: 'Inappropriate Screen Share',
        description: 'Sharing inappropriate, offensive, or non-relevant content',
        defaultPoints: 12,
        severity: 'moderate'
      },
      [incidentTypes.VERBAL_ABUSE]: {
        label: 'Verbal Abuse',
        description: 'Using abusive language, insults, or verbal attacks',
        defaultPoints: 18,
        severity: 'major'
      },
      [incidentTypes.TROLLING]: {
        label: 'Trolling',
        description: 'Deliberately provoking or annoying other participants',
        defaultPoints: 10,
        severity: 'moderate'
      }
    };
    
    res.json({
      success: true,
      incidentTypes: types
    });
  } catch (error) {
    console.error('Error fetching incident types:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch incident types' });
  }
};

// Get cyber scores for multiple users (for meeting participant lists)
export const getBulkCyberScores = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ 
        success: false, 
        message: 'userIds array is required' 
      });
    }
    
    // Limit to reasonable number of users
    if (userIds.length > 100) {
      return res.status(400).json({ 
        success: false, 
        message: 'Too many user IDs requested (max: 100)' 
      });
    }
    
    const cyberScores = await CyberScore.find({ userId: { $in: userIds } }).populate('userId', 'firstName lastName email');
    
    // Create a map of userId to cyber score data
    const scoresMap = {};
    
    cyberScores.forEach(score => {
      const userId = score.userId?._id?.toString() || score.userId?.toString();
      scoresMap[userId] = {
        currentScore: score.currentScore,
        reputationLevel: score.reputationLevel,
        isRestricted: score.isCurrentlyRestricted(),
        totalMeetings: score.meetingStats.totalMeetingsAttended,
        positiveReviews: score.meetingStats.positiveReviews,
        negativeReviews: score.meetingStats.negativeReviews
      };
    });
    
    // Fill in default values for users without cyber scores
    userIds.forEach(userId => {
      if (!scoresMap[userId]) {
        scoresMap[userId] = {
          currentScore: 85,
          reputationLevel: 'good',
          isRestricted: false,
          totalMeetings: 0,
          positiveReviews: 0,
          negativeReviews: 0
        };
      }
    });
    
    res.json({
      success: true,
      cyberScores: scoresMap
    });
  } catch (error) {
    console.error('Error fetching bulk cyber scores:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch cyber scores' });
  }
};

// Check admission eligibility based on cyber score and meeting settings
export const checkAdmissionEligibility = async (req, res) => {
  try {
    const { userId, meetingId, hostId } = req.body;
    
    if (!userId || !meetingId || !hostId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: userId, meetingId, hostId' 
      });
    }
    
    // Get user's cyber score
    let cyberScore = await CyberScore.findOne({ userId }).populate('userId', 'firstName lastName email');
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId });
      await cyberScore.save();
    }
    
    // Check if user is currently restricted
    const isCurrentlyRestricted = cyberScore.isCurrentlyRestricted();
    const currentScore = cyberScore.currentScore;
    const reputationLevel = cyberScore.reputationLevel;
    
    // Define admission thresholds
    const admissionRules = {
      // Automatic rejection conditions
      autoReject: {
        conditions: [
          isCurrentlyRestricted,
          reputationLevel === 'banned',
          currentScore < 25
        ],
        reason: 'Account restricted due to behavior violations'
      },
      
      // Requires host approval conditions
      requiresApproval: {
        conditions: [
          currentScore < 50,
          cyberScore.meetingStats.negativeReviews > cyberScore.meetingStats.positiveReviews,
          cyberScore.meetingStats.meetingsKickedFrom > 2
        ],
        reason: 'Low cyber score - requires host approval'
      },
      
      // Automatic approval conditions
      autoApprove: {
        conditions: [
          currentScore >= 70,
          reputationLevel === 'excellent' || reputationLevel === 'good',
          !isCurrentlyRestricted
        ]
      }
    };
    
    // Determine admission status
    let admissionStatus = 'unknown';
    let reason = '';
    
    if (admissionRules.autoReject.conditions.some(condition => condition)) {
      admissionStatus = 'rejected';
      reason = admissionRules.autoReject.reason;
    } else if (admissionRules.autoApprove.conditions.every(condition => condition)) {
      admissionStatus = 'approved';
      reason = 'High cyber score - automatic approval';
    } else {
      admissionStatus = 'requires_approval';
      reason = admissionRules.requiresApproval.reason;
    }
    
    res.json({
      success: true,
      admissionStatus,
      reason,
      userInfo: {
        userName: `${cyberScore.userId?.firstName || 'Unknown'} ${cyberScore.userId?.lastName || 'User'}`,
        currentScore,
        reputationLevel,
        isRestricted: isCurrentlyRestricted,
        totalMeetings: cyberScore.meetingStats.totalMeetingsAttended,
        negativeReviews: cyberScore.meetingStats.negativeReviews
      }
    });
  } catch (error) {
    console.error('Error checking admission eligibility:', error);
    res.status(500).json({ success: false, message: 'Failed to check admission eligibility' });
  }
};

// Get admission statistics for host dashboard
export const getAdmissionStats = async (req, res) => {
  try {
    const { hostId } = req.params;
    
    // This would typically be implemented with proper meeting tracking
    // For now, return basic stats structure
    const stats = {
      totalRequests: 0,
      autoApproved: 0,
      autoRejected: 0,
      requiresReview: 0,
      recentActivity: []
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching admission stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admission stats' });
  }
};