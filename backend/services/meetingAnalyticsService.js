import CyberScore from '../models/CyberScore.js';
import mongoose from 'mongoose';

class MeetingAnalyticsService {
  
  /**
   * Track when a user joins a meeting
   */
  static async trackMeetingJoin(userId, meetingId) {
    try {
      let cyberScore = await CyberScore.findOne({ userId });
      
      if (!cyberScore) {
        cyberScore = new CyberScore({ userId });
      }
      
      // Store join timestamp for duration calculation later
      if (!cyberScore.meetingJoinTimes) {
        cyberScore.meetingJoinTimes = {};
      }
      cyberScore.meetingJoinTimes[meetingId.toString()] = new Date();
      
      await cyberScore.save();
      console.log(`Tracked meeting join for user ${userId} in meeting ${meetingId}`);
      
    } catch (error) {
      console.error('Error tracking meeting join:', error);
    }
  }
  
  /**
   * Track when a user leaves a meeting and update stats
   */
  static async trackMeetingLeave(userId, meetingId, isCompleted = true) {
    try {
      let cyberScore = await CyberScore.findOne({ userId });
      
      if (!cyberScore) {
        console.log(`No cyber score found for user ${userId}`);
        return;
      }
      
      // Calculate meeting duration if we have join time
      let duration = 0;
      if (cyberScore.meetingJoinTimes && cyberScore.meetingJoinTimes[meetingId.toString()]) {
        const joinTime = new Date(cyberScore.meetingJoinTimes[meetingId.toString()]);
        duration = Math.round((new Date() - joinTime) / 60000); // Duration in minutes
        duration = Math.max(0, duration); // Ensure non-negative duration
        delete cyberScore.meetingJoinTimes[meetingId.toString()];
        console.log(`Calculated meeting duration: ${duration} minutes (from ${joinTime} to ${new Date()})`);
      }
      
      // Update meeting statistics
      if (isCompleted) {
        cyberScore.meetingStats.totalMeetingsAttended += 1;
        
        // Update average stay duration (only if we have a meaningful duration)
        if (duration > 0) {
          const previousTotal = cyberScore.meetingStats.averageStayDuration * (cyberScore.meetingStats.totalMeetingsAttended - 1);
          const newTotal = previousTotal + duration;
          cyberScore.meetingStats.averageStayDuration = Math.round(newTotal / cyberScore.meetingStats.totalMeetingsAttended);
          console.log(`Updated average duration: ${cyberScore.meetingStats.averageStayDuration} minutes (previous: ${cyberScore.meetingStats.averageStayDuration}, new meeting: ${duration} minutes)`);
        }
      }
      
      cyberScore.updatedAt = new Date();
      await cyberScore.save();
      
      console.log(`Tracked meeting leave for user ${userId}: duration=${duration}min, completed=${isCompleted}`);
      
      // Return updated stats for real-time updates
      return {
        userId,
        totalMeetingsAttended: cyberScore.meetingStats.totalMeetingsAttended,
        averageStayDuration: cyberScore.meetingStats.averageStayDuration,
        duration,
        isCompleted
      };
      
    } catch (error) {
      console.error('Error tracking meeting leave:', error);
    }
  }
  
  /**
   * Track when a user is kicked from a meeting
   */
  static async trackMeetingKick(userId, meetingId, reason = 'Host decision') {
    try {
      let cyberScore = await CyberScore.findOne({ userId });
      
      if (!cyberScore) {
        cyberScore = new CyberScore({ userId });
      }
      
      cyberScore.meetingStats.meetingsKickedFrom += 1;
      cyberScore.updatedAt = new Date();
      
      // Add to score history as a major incident
      let meetingObjectId = null;
      try {
        // Only create ObjectId if meetingId looks like a valid ObjectId format
        if (typeof meetingId === 'string' && meetingId.length === 24) {
          meetingObjectId = new mongoose.Types.ObjectId(meetingId);
        }
      } catch (error) {
        console.warn('Invalid meetingId for kick tracking, using null:', meetingId);
      }
      
      cyberScore.scoreHistory.push({
        meetingId: meetingObjectId,
        hostId: null, // Will be filled by calling function
        scoreChange: -10,
        category: 'overallParticipation',
        reason: `Kicked from meeting: ${reason}`,
        incidentType: 'major_violation',
        timestamp: new Date()
      });
      
      // Deduct points for being kicked
      cyberScore.currentScore = Math.max(0, cyberScore.currentScore - 10);
      cyberScore.updateReputationLevel();
      
      await cyberScore.save();
      
      console.log(`Tracked meeting kick for user ${userId}: total kicks=${cyberScore.meetingStats.meetingsKickedFrom}`);
      
      return {
        userId,
        meetingsKickedFrom: cyberScore.meetingStats.meetingsKickedFrom,
        newScore: cyberScore.currentScore,
        reputationLevel: cyberScore.reputationLevel
      };
      
    } catch (error) {
      console.error('Error tracking meeting kick:', error);
    }
  }
  
  /**
   * Track when a user is banned from meetings
   */
  static async trackMeetingBan(userId, meetingId, reason = 'Severe violation', bannedUntil = null) {
    try {
      let cyberScore = await CyberScore.findOne({ userId });
      
      if (!cyberScore) {
        cyberScore = new CyberScore({ userId });
      }
      
      cyberScore.meetingStats.meetingsBanned += 1;
      
      // Apply temporary ban if specified
      if (bannedUntil) {
        cyberScore.restrictions.temporaryBan.isActive = true;
        cyberScore.restrictions.temporaryBan.bannedUntil = bannedUntil;
        cyberScore.restrictions.temporaryBan.reason = reason;
      }
      
      // Add to score history as a severe incident
      let meetingObjectId = null;
      try {
        // Only create ObjectId if meetingId looks like a valid ObjectId format
        if (typeof meetingId === 'string' && meetingId.length === 24) {
          meetingObjectId = new mongoose.Types.ObjectId(meetingId);
        }
      } catch (error) {
        console.warn('Invalid meetingId for ban tracking, using null:', meetingId);
      }
      
      cyberScore.scoreHistory.push({
        meetingId: meetingObjectId,
        hostId: null, // Will be filled by calling function
        scoreChange: -25,
        category: 'overallParticipation',
        reason: `Banned from meetings: ${reason}`,
        incidentType: 'severe_violation',
        timestamp: new Date()
      });
      
      // Significant score deduction for ban
      cyberScore.currentScore = Math.max(0, cyberScore.currentScore - 25);
      cyberScore.updateReputationLevel();
      cyberScore.updatedAt = new Date();
      
      await cyberScore.save();
      
      console.log(`Tracked meeting ban for user ${userId}: total bans=${cyberScore.meetingStats.meetingsBanned}`);
      
      return {
        userId,
        meetingsBanned: cyberScore.meetingStats.meetingsBanned,
        newScore: cyberScore.currentScore,
        reputationLevel: cyberScore.reputationLevel,
        isBanned: cyberScore.restrictions.temporaryBan.isActive
      };
      
    } catch (error) {
      console.error('Error tracking meeting ban:', error);
    }
  }
  
  /**
   * Update positive/negative review counts when rating is submitted
   */
  static async updateReviewStats(userId, isPositiveReview) {
    try {
      let cyberScore = await CyberScore.findOne({ userId });
      
      if (!cyberScore) {
        cyberScore = new CyberScore({ userId });
      }
      
      if (isPositiveReview) {
        cyberScore.meetingStats.positiveReviews += 1;
      } else {
        cyberScore.meetingStats.negativeReviews += 1;
      }
      
      cyberScore.meetingStats.hostFeedbackCount += 1;
      cyberScore.updatedAt = new Date();
      
      await cyberScore.save();
      
      console.log(`Updated review stats for user ${userId}: positive=${cyberScore.meetingStats.positiveReviews}, negative=${cyberScore.meetingStats.negativeReviews}`);
      
      return {
        userId,
        positiveReviews: cyberScore.meetingStats.positiveReviews,
        negativeReviews: cyberScore.meetingStats.negativeReviews,
        hostFeedbackCount: cyberScore.meetingStats.hostFeedbackCount
      };
      
    } catch (error) {
      console.error('Error updating review stats:', error);
    }
  }
  
  /**
   * Get comprehensive meeting statistics for a user
   */
  static async getMeetingStats(userId) {
    try {
      const cyberScore = await CyberScore.findOne({ userId });
      
      if (!cyberScore) {
        return {
          totalMeetingsAttended: 0,
          meetingsKickedFrom: 0,
          meetingsBanned: 0,
          averageStayDuration: 0,
          hostFeedbackCount: 0,
          positiveReviews: 0,
          negativeReviews: 0
        };
      }
      
      return cyberScore.meetingStats;
      
    } catch (error) {
      console.error('Error getting meeting stats:', error);
      return null;
    }
  }
  
  /**
   * Calculate user engagement score based on meeting participation
   */
  static async calculateEngagementScore(userId) {
    try {
      const cyberScore = await CyberScore.findOne({ userId });
      
      if (!cyberScore) {
        return 0;
      }
      
      const stats = cyberScore.meetingStats;
      
      // Base score from meetings attended
      let engagementScore = Math.min(stats.totalMeetingsAttended * 2, 40);
      
      // Bonus for positive reviews
      engagementScore += Math.min(stats.positiveReviews * 3, 30);
      
      // Penalty for negative incidents
      engagementScore -= stats.negativeReviews * 2;
      engagementScore -= stats.meetingsKickedFrom * 5;
      engagementScore -= stats.meetingsBanned * 10;
      
      // Bonus for good average stay duration (above 30 minutes)
      if (stats.averageStayDuration > 30) {
        engagementScore += Math.min((stats.averageStayDuration - 30) / 5, 15);
      }
      
      return Math.max(0, Math.min(100, engagementScore));
      
    } catch (error) {
      console.error('Error calculating engagement score:', error);
      return 0;
    }
  }
  
}

export default MeetingAnalyticsService;