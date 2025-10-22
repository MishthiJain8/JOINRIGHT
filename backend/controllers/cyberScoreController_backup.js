import CyberScore, { incidentTypes } from '../models/CyberScore.js';
import User from '../models/user.js';

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
    
    // Add the incident
    const result = cyberScore.addIncident({
      hostId,
      hostName: `${host.firstName} ${host.lastName}`,
      meetingId,
      incidentType,
      reason,
      pointsDeducted,
      severity
    });
    
    await cyberScore.save();
    
    res.json({
      success: true,
      message: 'User rated successfully',
      result: {
        previousScore: result.previousScore,
        newScore: result.newScore,
        pointsDeducted,
        reputationLevel: cyberScore.reputationLevel
      }
    });
  } catch (error) {
    console.error('Error rating user:', error);
    res.status(500).json({ success: false, message: 'Failed to rate user' });
  }
};

// Get user's incident history (for profile page)
export const getUserIncidentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    const cyberScore = await CyberScore.findOne({ userId }).populate({
      path: 'scoreHistory.hostId',
      select: 'firstName lastName'
    });
    
    if (!cyberScore) {
      return res.json({
        success: true,
        incidents: [],
        totalIncidents: 0,
        currentScore: 85,
        reputationLevel: 'good'
      });
    }
    
    // Sort by most recent first
    const sortedHistory = cyberScore.scoreHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Paginate
    const startIndex = (page - 1) * limit;
    const paginatedHistory = sortedHistory.slice(startIndex, startIndex + limit);
    
    res.json({
      success: true,
      incidents: paginatedHistory,
      totalIncidents: cyberScore.scoreHistory.length,
      currentScore: cyberScore.currentScore,
      reputationLevel: cyberScore.reputationLevel,
      meetingStats: cyberScore.meetingStats
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
export const getBulkCyberScores = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds array is required' });
    }
    
    const cyberScores = await CyberScore.find({ 
      userId: { $in: userIds } 
    }).populate('userId', 'firstName lastName');
    
    // Create map of userId -> cyber score info
    const scoresMap = {};
    
    cyberScores.forEach(score => {
      scoresMap[score.userId._id.toString()] = {
        currentScore: score.currentScore,
        reputationLevel: score.reputationLevel,
        isRestricted: score.isCurrentlyRestricted(),
        totalMeetings: score.meetingStats.totalMeetingsAttended,
        negativeReviews: score.meetingStats.negativeReviews
      };
    });
    
    // Add default scores for users without cyber scores
    userIds.forEach(userId => {
      if (!scoresMap[userId]) {
        scoresMap[userId] = {
          currentScore: 85,
          reputationLevel: 'good',
          isRestricted: false,
          totalMeetings: 0,
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