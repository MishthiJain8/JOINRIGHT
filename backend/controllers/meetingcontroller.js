import Meeting from "../models/meeting.js";
import User from "../models/user.js";
import CyberScore from "../models/cyberScore.js";
import MeetingParticipant from "../models/meetingParticipant.js";
import NotificationService from "../services/notificationService.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from 'uuid';
import logger from "../utils/logger.js";

// Generate alphanumeric meeting ID in format: ABC-123-DEF
const generateMeetingId = () => {
  const letters = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'; // Exclude O to avoid confusion with 0
  const numbers = '123456789'; // Exclude 0 to avoid confusion with O
  
  // Generate 3 letters
  const part1 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  
  // Generate 3 numbers
  const part2 = Array.from({length: 3}, () => numbers[Math.floor(Math.random() * numbers.length)]).join('');
  
  // Generate 3 letters
  const part3 = Array.from({length: 3}, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  
  return `${part1}-${part2}-${part3}`; // Format: ABC-123-DEF
};

// Create a meeting
export const createMeeting = async (req, res) => {
  try {
    const { title, password, creator, description, settings, participants, scheduledAt } = req.body;

    // Input validation - only basic fields required
    if (!title || !password || !creator) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: title, password, creator" 
      });
    }

    // scheduledAt is now completely optional - only used for notifications
    // No validation needed as it's purely for reminders

    // Verify creator exists
    const creatorUser = await User.findOne({ email: creator });
    if (!creatorUser) {
      return res.status(404).json({ 
        success: false, 
        error: "Creator not found" 
      });
    }

    // Generate a unique meeting ID (alphanumeric format: ABC-123-DEF)
    let meetingId;
    let attempts = 0;
    do {
      meetingId = generateMeetingId();
      attempts++;
      if (attempts > 10) {
        return res.status(500).json({ 
          success: false, 
          error: "Failed to generate unique meeting ID" 
        });
      }
    } while (await Meeting.findOne({ meetingId }));

    const meeting = await Meeting.create({
      title: title.trim(),
      password,
      meetingId,
      creator,
      hostId: creatorUser._id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null, // Optional for notifications only
      description: description?.trim() || '',
      status: 'scheduled',
      participants: participants || [creator],
      // Enable host controls by default
      hostControls: {
        requireHostApproval: true,
        allowParticipantsToJoinBeforeHost: false,
        autoAdmitRegisteredUsers: false,
        maxParticipants: settings?.maxParticipants || 100,
        enableWaitingRoom: true
      },
      settings: {
        allowScreenShare: settings?.allowScreenShare ?? true,
        allowChat: settings?.allowChat ?? true,
        allowRecording: settings?.allowRecording ?? true,
        waitingRoom: settings?.waitingRoom ?? true, // Enable by default
        muteOnEntry: settings?.muteOnEntry ?? false
      }
    });

    logger.info(`Meeting created: ${meetingId} by ${creator}`);

    // Create notifications for participants if scheduledAt is provided
    try {
      if (meeting.scheduledAt && participants && participants.length > 0) {
        await NotificationService.createMeetingNotifications(meeting, participants);
        
        // Create invitation notifications for participants
        for (const participantEmail of participants) {
          if (participantEmail !== creator) {
            await NotificationService.createMeetingInvitation(meeting, participantEmail);
          }
        }
      }
    } catch (notificationError) {
      // Don't fail the meeting creation if notifications fail
      logger.warn('Failed to create notifications for meeting:', notificationError);
    }

    res.json({ 
      success: true, 
      meeting: {
        ...meeting.toObject()
      }
    });
  } catch (err) {
    logger.error('Create meeting error:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Failed to create meeting' : err.message 
    });
  }
};

// Join meeting with enhanced validation and status tracking
export const joinMeeting = async (req, res) => {
  try {
    const { meetingId, password, user } = req.body;

    if (!user) {
      return res.status(400).json({ 
        success: false, 
        error: "User information is required" 
      });
    }

    if (!meetingId) {
      return res.status(400).json({ 
        success: false, 
        error: "Meeting ID is required" 
      });
    }

    // Find meeting by meetingId only (no more link-based access)
    const meeting = await Meeting.findOne({ meetingId });
    
    if (!meeting) {
      return res.status(404).json({ 
        success: false, 
        error: "Meeting not found" 
      });
    }

    // Check if meeting has ended
    if (meeting.status === 'ended') {
      return res.status(400).json({ 
        success: false, 
        error: "This meeting has ended" 
      });
    }

    // Validate password
    if (meeting.password !== password) {
      return res.status(401).json({ 
        success: false, 
        error: "Invalid meeting password" 
      });
    }

    // Verify user exists (need to do this before host check)
    const userExists = await User.findOne({ email: user });
    if (!userExists) {
      return res.status(404).json({ 
        success: false, 
        error: "User not found" 
      });
    }

    // Check if user is the host
    const isHost = meeting.creator === user || (meeting.hostId && meeting.hostId.equals(userExists._id));

    // Check if meeting has a scheduled time and enforce it
    if (meeting.scheduledAt) {
      const now = new Date();
      const scheduledTime = new Date(meeting.scheduledAt);
      
      // Allow hosts to join 15 minutes early, participants must wait for scheduled time
      const earlyJoinWindow = 15 * 60 * 1000; // 15 minutes in milliseconds
      const earliestJoinTime = isHost ? 
        new Date(scheduledTime.getTime() - earlyJoinWindow) : 
        scheduledTime;
      
      if (now < earliestJoinTime) {
        const timeUntilStart = Math.ceil((earliestJoinTime.getTime() - now.getTime()) / (1000 * 60)); // minutes
        const message = isHost ? 
          `Meeting is scheduled to start at ${scheduledTime.toLocaleString()}. You can join ${Math.ceil(earlyJoinWindow / (1000 * 60))} minutes before the scheduled time. Please wait ${timeUntilStart} more minute(s).` :
          `Meeting is scheduled to start at ${scheduledTime.toLocaleString()}. Please wait ${timeUntilStart} more minute(s) before joining.`;
        
        return res.status(400).json({
          success: false,
          error: "Meeting not started yet",
          message: message,
          scheduledAt: scheduledTime.toISOString(),
          canJoinAt: earliestJoinTime.toISOString(),
          minutesToWait: timeUntilStart,
          meeting: {
            title: meeting.title,
            meetingId: meeting.meetingId,
            status: meeting.status,
            scheduledAt: meeting.scheduledAt
          }
        });
      }
    }
    
    // If host controls are enabled and user is not the host
    if (meeting.hostControls?.requireHostApproval && !isHost) {
      // Get or create user's cyber score
      let cyberScore = await CyberScore.findOne({ userId: userExists._id });
      if (!cyberScore) {
        cyberScore = new CyberScore({ userId: userExists._id });
        await cyberScore.save();
      }
      
      const trustIndicator = cyberScore.getTrustIndicator();
      
      // Check if user is currently restricted
      if (trustIndicator.isRestricted) {
        return res.status(403).json({
          success: false,
          error: "You are currently restricted from joining meetings",
          cyberScore: trustIndicator
        });
      }
      
      // Add to waiting room
      meeting.addToWaitingRoom(userExists._id, trustIndicator);
      await meeting.save();
      
      return res.json({
        success: true,
        status: 'waiting_for_approval',
        message: 'You have been added to the waiting room. The host will review your request.',
        cyberScore: {
          score: trustIndicator.score,
          level: trustIndicator.level
        },
        meeting: {
          title: meeting.title,
          meetingId: meeting.meetingId,
          status: meeting.status
        }
      });
    }
    
    // For hosts or when host controls are disabled, allow direct entry
    // Add user to participants if not already there
    if (!meeting.participants.includes(user)) {
      meeting.participants.push(user);
    }

    // Track active participant
    const existingActive = meeting.activeParticipants.find(p => p.userId === user);
    if (!existingActive) {
      meeting.activeParticipants.push({
        userId: user,
        joinedAt: new Date()
      });
    }

    // Create or update meeting participant record
    let participant = await MeetingParticipant.findOne({ 
      meetingId: meeting._id, 
      userId: userExists._id 
    });
    
    if (!participant) {
      // Get user's cyber score for snapshot
      let cyberScore = await CyberScore.findOne({ userId: userExists._id });
      if (!cyberScore) {
        cyberScore = new CyberScore({ userId: userExists._id });
        await cyberScore.save();
      }
      
      const trustIndicator = cyberScore.getTrustIndicator();
      
      participant = new MeetingParticipant({
        meetingId: meeting._id,
        userId: userExists._id,
        status: isHost ? 'joined' : 'approved',
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
    
    // Add join activity
    participant.addActivity('joined');
    await participant.save();

    // Update meeting status to ongoing when host joins (instant meetings)
    if (meeting.status === 'scheduled' && isHost) {
      meeting.status = 'ongoing';
      meeting.startedAt = new Date();
      
      // Notify participants that meeting has started
      try {
        await NotificationService.notifyMeetingStarted(meeting);
      } catch (notificationError) {
        logger.warn('Failed to send meeting started notifications:', notificationError);
      }
    }

    await meeting.save();
    
    logger.info(`User ${user} joined meeting ${meeting.meetingId}`);

    // Get updated cyber score for response
    const cyberScore = await CyberScore.findOne({ userId: userExists._id });
    const trustIndicator = cyberScore ? cyberScore.getTrustIndicator() : null;
    
    res.json({ 
      success: true,
      meeting: {
        ...meeting.toObject(),
        canJoin: true
      },
      user: {
        email: userExists.email,
        firstName: userExists.firstName,
        lastName: userExists.lastName,
        isCreator: meeting.creator === user,
        isHost: isHost
      },
      cyberScore: trustIndicator ? {
        score: trustIndicator.score,
        level: trustIndicator.level,
        totalMeetings: trustIndicator.totalMeetings
      } : null,
      participant: participant ? participant.getHostSummary() : null
    });
  } catch (err) {
    logger.error('Join meeting error:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Failed to join meeting' : err.message 
    });
  }
};

// Get meetings of a user (history + scheduled)
export const getUserMeetings = async (req, res) => {
  try {
    const { email } = req.params;

    const meetings = await Meeting.find({
      $or: [{ creator: email }, { participants: email }],
    }).sort({ scheduledAt: 1 });

    res.json({ meetings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save a recording for a meeting
export const saveRecording = async (req, res) => {
  try {
    const { link, fileName } = req.body;

    const meeting = await Meeting.findOne({ link });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    meeting.recordings.push({ fileName });
    await meeting.save();

    res.json({ success: true, recording: fileName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get recordings of a meeting
export const getRecordings = async (req, res) => {
  try {
    const { link } = req.params;

    const meeting = await Meeting.findOne({ link });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    res.json({ recordings: meeting.recordings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Save chat message
export const saveChatMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { sender, message, type = 'text' } = req.body;

    const meeting = await Meeting.findOne({ meetingId: roomId });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    meeting.chatHistory.push({
      sender,
      message,
      type,
      time: new Date()
    });

    await meeting.save();
    res.json({ success: true });
  } catch (err) {
    console.error('Save chat error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Get chat history
export const getChatHistory = async (req, res) => {
  try {
    const { roomId } = req.params;

    const meeting = await Meeting.findOne({ meetingId: roomId });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    res.json({ chatHistory: meeting.chatHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update meeting status
export const updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status } = req.body;

    const meeting = await Meeting.findOneAndUpdate(
      { meetingId },
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    res.json({ success: true, meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get meeting by ID
export const getMeetingById = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) return res.status(404).json({ error: "Meeting not found" });

    res.json({ meeting });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// End meeting
export const endMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { creator } = req.body;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ 
        success: false, 
        error: "Meeting not found" 
      });
    }

    if (meeting.creator !== creator) {
      return res.status(403).json({ 
        success: false, 
        error: "Only meeting creator can end the meeting" 
      });
    }

    // Mark all active participants as left
    meeting.activeParticipants.forEach(participant => {
      if (!participant.leftAt) {
        participant.leftAt = new Date();
      }
    });

    meeting.status = 'ended';
    meeting.endedAt = new Date();
    await meeting.save();

    logger.info(`Meeting ${meetingId} ended by ${creator}`);

    res.json({ success: true, message: "Meeting ended successfully" });
  } catch (err) {
    logger.error('End meeting error:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Failed to end meeting' : err.message 
    });
  }
};

// Get upcoming meetings for a user
export const getUpcomingMeetings = async (req, res) => {
  try {
    const { email } = req.params;
    const { limit = 10 } = req.query;

    const now = new Date();
    const meetings = await Meeting.find({
      $or: [{ creator: email }, { participants: email }],
      scheduledAt: { $gt: now },
      status: { $ne: 'ended' }
    })
    .sort({ scheduledAt: 1 })
    .limit(parseInt(limit))
    .lean();

    // Add additional info for each meeting
    const enrichedMeetings = meetings.map(meeting => ({
      ...meeting,
      isCreator: meeting.creator === email,
      timeUntilStart: new Date(meeting.scheduledAt) - now,
      canJoin: (new Date(meeting.scheduledAt) - now) <= 5 * 60 * 1000 // Can join 5 minutes before
    }));

    res.json({ 
      success: true, 
      meetings: enrichedMeetings,
      count: enrichedMeetings.length 
    });
  } catch (err) {
    logger.error('Get upcoming meetings error:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Failed to fetch meetings' : err.message 
    });
  }
};

// Get meeting analytics/statistics
export const getMeetingStats = async (req, res) => {
  try {
    const { email } = req.params;
    const { period = '30' } = req.query; // days

    const days = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const pipeline = [
      {
        $match: {
          creator: email,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalMeetings: { $sum: 1 },
          completedMeetings: {
            $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] }
          },
          ongoingMeetings: {
            $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] }
          },
          scheduledMeetings: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          },
          totalParticipants: { $sum: { $size: '$participants' } },
          averageParticipants: { $avg: { $size: '$participants' } }
        }
      }
    ];

    const stats = await Meeting.aggregate(pipeline);
    const result = stats[0] || {
      totalMeetings: 0,
      completedMeetings: 0,
      ongoingMeetings: 0,
      scheduledMeetings: 0,
      totalParticipants: 0,
      averageParticipants: 0
    };

    res.json({ 
      success: true, 
      stats: result,
      period: `${days} days`
    });
  } catch (err) {
    logger.error('Get meeting stats error:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Failed to fetch stats' : err.message 
    });
  }
};

// Update meeting details
export const updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { title, description, scheduledAt, settings, user } = req.body;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ 
        success: false, 
        error: "Meeting not found" 
      });
    }

    // Only creator can update meeting
    if (meeting.creator !== user) {
      return res.status(403).json({ 
        success: false, 
        error: "Only meeting creator can update the meeting" 
      });
    }

    // Don't allow updates to ongoing or ended meetings
    if (meeting.status !== 'scheduled') {
      return res.status(400).json({ 
        success: false, 
        error: "Cannot update ongoing or ended meetings" 
      });
    }

    // Update fields
    if (title) meeting.title = title.trim();
    if (description !== undefined) meeting.description = description.trim();
    if (scheduledAt) {
      const newScheduledTime = new Date(scheduledAt);
      if (newScheduledTime <= new Date()) {
        return res.status(400).json({ 
          success: false, 
          error: "Scheduled time must be in the future" 
        });
      }
      meeting.scheduledAt = newScheduledTime;
    }
    if (settings) {
      meeting.settings = { ...meeting.settings, ...settings };
    }

    meeting.updatedAt = new Date();
    await meeting.save();

    logger.info(`Meeting ${meetingId} updated by ${user}`);

    res.json({ 
      success: true, 
      meeting: meeting.toObject(),
      message: "Meeting updated successfully" 
    });
  } catch (err) {
    logger.error('Update meeting error:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Failed to update meeting' : err.message 
    });
  }
};

// Delete meeting (only if not started yet)
export const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { user } = req.body;

    const meeting = await Meeting.findOne({ meetingId });
    if (!meeting) {
      return res.status(404).json({ 
        success: false, 
        error: "Meeting not found" 
      });
    }

    // Only creator can delete meeting
    if (meeting.creator !== user) {
      return res.status(403).json({ 
        success: false, 
        error: "Only meeting creator can delete the meeting" 
      });
    }

    // Don't allow deletion of ongoing meetings
    if (meeting.status === 'ongoing') {
      return res.status(400).json({ 
        success: false, 
        error: "Cannot delete ongoing meetings. End the meeting first." 
      });
    }

    // Notify participants about cancellation before deletion
    try {
      await NotificationService.notifyMeetingCancelled(meeting, 'Meeting was cancelled by the host');
    } catch (notificationError) {
      logger.warn('Failed to send meeting cancellation notifications:', notificationError);
    }

    await Meeting.findOneAndDelete({ meetingId });

    logger.info(`Meeting ${meetingId} deleted by ${user}`);

    res.json({ 
      success: true, 
      message: "Meeting deleted successfully" 
    });
  } catch (err) {
    logger.error('Delete meeting error:', err);
    res.status(500).json({ 
      success: false, 
      error: process.env.NODE_ENV === 'production' ? 'Failed to delete meeting' : err.message 
    });
  }
};
