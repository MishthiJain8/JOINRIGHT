import MeetingNotification from '../models/meetingNotification.js';
import User from '../models/user.js';
import Meeting from '../models/meeting.js';

class NotificationService {
  
  // Create notifications when a meeting is created
  async createMeetingNotifications(meeting, participantEmails) {
    try {
      const notifications = await MeetingNotification.createMeetingReminders(meeting, participantEmails);
      
      if (notifications.length > 0) {
        await MeetingNotification.insertMany(notifications);
        console.log(`Created ${notifications.length} meeting reminder notifications`);
      }
      
      return notifications;
    } catch (error) {
      console.error('Error creating meeting notifications:', error);
      throw error;
    }
  }
  
  // Create notification for meeting invitation
  async createMeetingInvitation(meeting, participantEmail) {
    try {
      const participant = await User.findOne({ email: participantEmail });
      if (!participant) {
        console.warn(`User not found for email: ${participantEmail}`);
        return null;
      }
      
      const notification = new MeetingNotification({
        meetingId: meeting._id,
        userId: participant._id,
        type: 'meeting_invitation',
        title: `Meeting Invitation: ${meeting.title}`,
        message: `You've been invited to join "${meeting.title}"${meeting.scheduledAt ? ` scheduled for ${meeting.scheduledAt.toLocaleString()}` : ''}`,
        scheduledMeetingTime: meeting.scheduledAt,
        meetingDetails: {
          meetingTitle: meeting.title,
          meetingId: meeting.meetingId,
          hostName: meeting.creator,
          meetingLink: meeting.link
        }
      });
      
      await notification.save();
      console.log(`Created meeting invitation notification for ${participantEmail}`);
      return notification;
    } catch (error) {
      console.error('Error creating meeting invitation:', error);
      throw error;
    }
  }
  
  // Create notification when meeting starts
  async notifyMeetingStarted(meeting) {
    try {
      const participants = await User.find({ email: { $in: meeting.participants } });
      const notifications = [];
      
      for (const participant of participants) {
        if (participant.email === meeting.creator) continue; // Don't notify the host
        
        const notification = new MeetingNotification({
          meetingId: meeting._id,
          userId: participant._id,
          type: 'meeting_started',
          title: `Meeting Started: ${meeting.title}`,
          message: `The meeting "${meeting.title}" has started. Click to join now.`,
          meetingDetails: {
            meetingTitle: meeting.title,
            meetingId: meeting.meetingId,
            hostName: meeting.creator,
            meetingLink: meeting.link
          }
        });
        
        await notification.save();
        notifications.push(notification);
      }
      
      console.log(`Created ${notifications.length} meeting started notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating meeting started notifications:', error);
      throw error;
    }
  }
  
  // Create notification when meeting is cancelled
  async notifyMeetingCancelled(meeting, reason = '') {
    try {
      const participants = await User.find({ email: { $in: meeting.participants } });
      const notifications = [];
      
      for (const participant of participants) {
        if (participant.email === meeting.creator) continue; // Don't notify the host
        
        const notification = new MeetingNotification({
          meetingId: meeting._id,
          userId: participant._id,
          type: 'meeting_cancelled',
          title: `Meeting Cancelled: ${meeting.title}`,
          message: `The meeting "${meeting.title}" has been cancelled${reason ? `. Reason: ${reason}` : '.'}`,
          meetingDetails: {
            meetingTitle: meeting.title,
            meetingId: meeting.meetingId,
            hostName: meeting.creator,
            meetingLink: meeting.link
          }
        });
        
        await notification.save();
        notifications.push(notification);
      }
      
      console.log(`Created ${notifications.length} meeting cancelled notifications`);
      return notifications;
    } catch (error) {
      console.error('Error creating meeting cancelled notifications:', error);
      throw error;
    }
  }
  
  // Process pending notifications (to be called by a scheduler)
  async processPendingNotifications() {
    try {
      const pendingNotifications = await MeetingNotification.find({
        status: 'pending',
        $or: [
          { reminderTime: { $lte: new Date() } },
          { reminderTime: null }
        ]
      }).populate('userId meetingId');
      
      console.log(`Processing ${pendingNotifications.length} pending notifications`);
      
      for (const notification of pendingNotifications) {
        await this.deliverNotification(notification);
      }
      
      return pendingNotifications.length;
    } catch (error) {
      console.error('Error processing pending notifications:', error);
      throw error;
    }
  }
  
  // Deliver a single notification
  async deliverNotification(notification) {
    try {
      // Mark delivery attempt
      notification.recordDeliveryAttempt();
      
      // Here you would integrate with actual notification services
      // For now, we'll just mark it as sent
      
      if (notification.channels.inApp) {
        // In-app notification logic would go here
        console.log(`Delivering in-app notification to user ${notification.userId}: ${notification.title}`);
      }
      
      if (notification.channels.email) {
        // Email notification logic would go here
        console.log(`Delivering email notification to user ${notification.userId}: ${notification.title}`);
      }
      
      if (notification.channels.push) {
        // Push notification logic would go here
        console.log(`Delivering push notification to user ${notification.userId}: ${notification.title}`);
      }
      
      // Mark as sent
      notification.markAsSent();
      await notification.save();
      
      console.log(`Successfully delivered notification: ${notification.title}`);
    } catch (error) {
      console.error('Error delivering notification:', error);
      
      // Record the error
      notification.recordDeliveryAttempt(error.message);
      await notification.save();
      
      throw error;
    }
  }
  
  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    try {
      const {
        status = null,
        type = null,
        limit = 20,
        skip = 0,
        unreadOnly = false
      } = options;
      
      const query = { userId };
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }
      
      if (unreadOnly) {
        query.status = { $in: ['pending', 'sent'] };
      }
      
      const notifications = await MeetingNotification
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('meetingId', 'title meetingId status');
      
      return notifications;
    } catch (error) {
      console.error('Error fetching user notifications:', error);
      throw error;
    }
  }
  
  // Mark notification as read
  async markNotificationAsRead(notificationId, userId) {
    try {
      const notification = await MeetingNotification.findOne({
        _id: notificationId,
        userId: userId
      });
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      notification.markAsRead();
      await notification.save();
      
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }
  
  // Dismiss notification
  async dismissNotification(notificationId, userId) {
    try {
      const notification = await MeetingNotification.findOne({
        _id: notificationId,
        userId: userId
      });
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      notification.dismiss();
      await notification.save();
      
      return notification;
    } catch (error) {
      console.error('Error dismissing notification:', error);
      throw error;
    }
  }
  
  // Get notification counts for user
  async getNotificationCounts(userId) {
    try {
      const [unreadCount, totalCount] = await Promise.all([
        MeetingNotification.countDocuments({
          userId,
          status: { $in: ['pending', 'sent'] }
        }),
        MeetingNotification.countDocuments({ userId })
      ]);
      
      return {
        unread: unreadCount,
        total: totalCount
      };
    } catch (error) {
      console.error('Error getting notification counts:', error);
      throw error;
    }
  }
  
  // Clean up old notifications
  async cleanupOldNotifications(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      const result = await MeetingNotification.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $in: ['read', 'dismissed'] }
      });
      
      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result.deletedCount;
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();