import Meeting from '../models/meeting.js';
import MeetingParticipant from '../models/meetingParticipant.js';
import CyberScore from '../models/cyberScore.js';
import User from '../models/user.js';
import logger from '../utils/logger.js';

// Start meeting (host only)
export const startMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const hostUserId = req.userId;

    const meeting = await Meeting.findOne({ meetingId }).populate('hostId');
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is the host or co-host
    if (!meeting.canBeStarted(hostUserId)) {
      return res.status(403).json({ 
        error: 'Only the meeting host or co-hosts can start the meeting' 
      });
    }

    // Update meeting status
    meeting.status = 'ongoing';
    meeting.startedAt = new Date();
    meeting.updatedAt = new Date();
    await meeting.save();

    // Log the meeting start
    logger.info(`Meeting ${meetingId} started by host ${req.user.email}`);

    res.json({
      success: true,
      message: 'Meeting started successfully',
      meeting: {
        meetingId: meeting.meetingId,
        status: meeting.status,
        startedAt: meeting.startedAt
      }
    });

  } catch (error) {
    logger.error('Error starting meeting:', error);
    res.status(500).json({ error: 'Failed to start meeting' });
  }
};

// Get waiting room participants (host only)
export const getWaitingRoomParticipants = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const hostUserId = req.userId;

    const meeting = await Meeting.findOne({ meetingId })
      .populate('waitingRoom.participants.userId', 'firstName lastName email profilePicture');
    
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is host or co-host
    if (!meeting.isHostOrCoHost(hostUserId)) {
      return res.status(403).json({ 
        error: 'Only the meeting host or co-hosts can view waiting room' 
      });
    }

    // Get detailed participant data with cyber scores
    const waitingParticipants = await Promise.all(
      meeting.waitingRoom.participants.map(async (participant) => {
        const cyberScore = await CyberScore.findOne({ userId: participant.userId._id });
        const trustIndicator = cyberScore ? cyberScore.getTrustIndicator() : {
          score: 500,
          level: 'average',
          totalMeetings: 0,
          positiveReviews: 0,
          negativeReviews: 0,
          isRestricted: false,
          lastIncident: null
        };

        return {
          userId: participant.userId._id,
          userInfo: {
            firstName: participant.userId.firstName,
            lastName: participant.userId.lastName,
            email: participant.userId.email,
            profilePicture: participant.userId.profilePicture
          },
          requestedAt: participant.requestedAt,
          cyberScore: trustIndicator,
          waitingDuration: Math.round((new Date() - participant.requestedAt) / 1000 / 60) // minutes
        };
      })
    );

    res.json({
      success: true,
      participants: waitingParticipants,
      totalWaiting: waitingParticipants.length
    });

  } catch (error) {
    logger.error('Error getting waiting room participants:', error);
    res.status(500).json({ error: 'Failed to get waiting room participants' });
  }
};

// Approve/Deny participant (host only)
export const manageParticipantEntry = async (req, res) => {
  try {
    const { meetingId, participantUserId } = req.params;
    const { action, reason, notes } = req.body; // action: 'approve' or 'deny'
    const hostUserId = req.userId;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is host or co-host
    if (!meeting.isHostOrCoHost(hostUserId)) {
      return res.status(403).json({ 
        error: 'Only the meeting host or co-hosts can manage participant entry' 
      });
    }

    // Find or create participant record
    let participant = await MeetingParticipant.findOne({ 
      meetingId: meeting._id, 
      userId: participantUserId 
    });

    if (!participant) {
      // Get user's cyber score for snapshot
      const cyberScore = await CyberScore.findOne({ userId: participantUserId });
      const trustIndicator = cyberScore ? cyberScore.getTrustIndicator() : {
        score: 500,
        level: 'average',
        totalMeetings: 0,
        positiveReviews: 0,
        negativeReviews: 0,
        isRestricted: false
      };

      participant = new MeetingParticipant({
        meetingId: meeting._id,
        userId: participantUserId,
        status: 'waiting',
        cyberScoreSnapshot: {
          score: trustIndicator.score,
          level: trustIndicator.level,
          totalMeetings: trustIndicator.totalMeetings,
          positiveReviews: trustIndicator.positiveReviews,
          negativeReviews: trustIndicator.negativeReviews,
          lastIncidentDate: trustIndicator.lastIncident?.timestamp,
          snapshotTakenAt: new Date()
        }
      });
    }

    // Add host action
    participant.addHostAction(action === 'approve' ? 'approved' : 'denied', hostUserId, reason, notes);
    await participant.save();

    // Remove from waiting room
    meeting.removeFromWaitingRoom(participantUserId);
    await meeting.save();

    // Log the action
    logger.info(`Participant ${participantUserId} ${action}d by host ${req.user.email} in meeting ${meetingId}`);

    res.json({
      success: true,
      message: `Participant ${action}d successfully`,
      participant: {
        userId: participantUserId,
        status: participant.status,
        action: action
      }
    });

  } catch (error) {
    logger.error('Error managing participant entry:', error);
    res.status(500).json({ error: 'Failed to manage participant entry' });
  }
};

// Get meeting participants with cyber scores (host only)
export const getMeetingParticipants = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const hostUserId = req.userId;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is host or co-host
    if (!meeting.isHostOrCoHost(hostUserId)) {
      return res.status(403).json({ 
        error: 'Only the meeting host or co-hosts can view participants' 
      });
    }

    // Get all participants in the meeting
    const participants = await MeetingParticipant.find({ 
      meetingId: meeting._id,
      status: { $in: ['approved', 'joined'] }
    })
    .populate('userId', 'firstName lastName email profilePicture')
    .sort({ 'sessionData.joinedAt': -1 });

    const participantSummaries = participants.map(p => ({
      ...p.getHostSummary(),
      userInfo: {
        firstName: p.userId.firstName,
        lastName: p.userId.lastName,
        email: p.userId.email,
        profilePicture: p.userId.profilePicture
      }
    }));

    res.json({
      success: true,
      participants: participantSummaries,
      totalParticipants: participantSummaries.length
    });

  } catch (error) {
    logger.error('Error getting meeting participants:', error);
    res.status(500).json({ error: 'Failed to get meeting participants' });
  }
};

// Manage participant during meeting (kick, mute, etc.)
export const manageParticipant = async (req, res) => {
  try {
    const { meetingId, participantUserId } = req.params;
    const { action, reason, notes } = req.body;
    const hostUserId = req.userId;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is host or co-host
    if (!meeting.isHostOrCoHost(hostUserId)) {
      return res.status(403).json({ 
        error: 'Only the meeting host or co-hosts can manage participants' 
      });
    }

    const participant = await MeetingParticipant.findOne({ 
      meetingId: meeting._id, 
      userId: participantUserId 
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Add host action
    participant.addHostAction(action, hostUserId, reason, notes);
    await participant.save();

    // Log the action
    logger.info(`Participant ${participantUserId} ${action} by host ${req.user.email} in meeting ${meetingId}`);

    res.json({
      success: true,
      message: `Participant ${action} successful`,
      participant: participant.getHostSummary()
    });

  } catch (error) {
    logger.error('Error managing participant:', error);
    res.status(500).json({ error: 'Failed to manage participant' });
  }
};

// Submit cyber score rating for participant
export const submitCyberScoreRating = async (req, res) => {
  try {
    const { meetingId, participantUserId } = req.params;
    const { 
      behaviorRating, 
      comments, 
      recommended, 
      incidentType = 'neutral',
      evidence 
    } = req.body;
    const hostUserId = req.userId;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ error: 'Meeting not found' });
    }

    // Check if user is host or co-host
    if (!meeting.isHostOrCoHost(hostUserId)) {
      return res.status(403).json({ 
        error: 'Only the meeting host or co-hosts can submit ratings' 
      });
    }

    // Find participant
    const participant = await MeetingParticipant.findOne({ 
      meetingId: meeting._id, 
      userId: participantUserId 
    });

    if (!participant) {
      return res.status(404).json({ error: 'Participant not found' });
    }

    // Update participant feedback
    participant.hostFeedback = {
      behaviorRating,
      comments,
      recommended,
      ratedBy: hostUserId,
      ratedAt: new Date()
    };
    await participant.save();

    // Update cyber score
    let cyberScore = await CyberScore.findOne({ userId: participantUserId });
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId: participantUserId });
    }

    // Calculate score changes based on ratings
    const categories = Object.keys(behaviorRating);
    for (const category of categories) {
      const rating = behaviorRating[category];
      let scoreChange = 0;
      
      // Convert 1-5 rating to score change (-20 to +20)
      if (rating >= 4) {
        scoreChange = (rating - 3) * 10; // +10 to +20
      } else if (rating <= 2) {
        scoreChange = (rating - 3) * 10; // -10 to -20
      }
      // rating = 3 gives scoreChange = 0 (neutral)

      if (scoreChange !== 0) {
        cyberScore.addScoreChange({
          meetingId: meeting._id,
          hostId: hostUserId,
          scoreChange,
          category,
          reason: comments || `Host rating: ${rating}/5`,
          incidentType,
          evidence
        });
      }
    }

    // Update meeting stats
    cyberScore.meetingStats.hostFeedbackCount += 1;
    await cyberScore.save();

    logger.info(`Cyber score rating submitted for user ${participantUserId} by host ${req.user.email}`);

    res.json({
      success: true,
      message: 'Rating submitted successfully',
      updatedScore: cyberScore.getTrustIndicator()
    });

  } catch (error) {
    logger.error('Error submitting cyber score rating:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
};

// Get user's cyber score history
export const getUserCyberScore = async (req, res) => {
  try {
    const { userId } = req.params;

    const cyberScore = await CyberScore.findOne({ userId })
      .populate('scoreHistory.meetingId', 'title meetingId scheduledAt')
      .populate('scoreHistory.hostId', 'firstName lastName email');

    if (!cyberScore) {
      return res.json({
        success: true,
        cyberScore: {
          totalScore: 500,
          reputationLevel: 'average',
          behaviorMetrics: {
            respectfulCommunication: 100,
            punctuality: 100,
            followsGuidelines: 100,
            technicalConduct: 100,
            overallParticipation: 100
          },
          meetingStats: {
            totalMeetingsAttended: 0,
            meetingsKickedFrom: 0,
            meetingsBanned: 0,
            positiveReviews: 0,
            negativeReviews: 0
          },
          scoreHistory: [],
          restrictions: {
            temporaryBan: { isActive: false },
            permanentRestrictions: []
          }
        }
      });
    }

    res.json({
      success: true,
      cyberScore: {
        totalScore: cyberScore.totalScore,
        reputationLevel: cyberScore.reputationLevel,
        behaviorMetrics: cyberScore.behaviorMetrics,
        meetingStats: cyberScore.meetingStats,
        scoreHistory: cyberScore.scoreHistory.slice(-10), // Last 10 incidents
        restrictions: cyberScore.restrictions,
        trustIndicator: cyberScore.getTrustIndicator()
      }
    });

  } catch (error) {
    logger.error('Error getting user cyber score:', error);
    res.status(500).json({ error: 'Failed to get cyber score' });
  }
};