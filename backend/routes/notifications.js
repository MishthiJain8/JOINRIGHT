import express from 'express';
import NotificationService from '../services/notificationService.js';
import { authenticateToken as auth } from '../middleware/auth.js';

const router = express.Router();

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const {
      status,
      type,
      limit = 20,
      skip = 0,
      unreadOnly = false
    } = req.query;

    const notifications = await NotificationService.getUserNotifications(req.user.id, {
      status,
      type,
      limit: parseInt(limit),
      skip: parseInt(skip),
      unreadOnly: unreadOnly === 'true'
    });

    res.json({
      success: true,
      notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

// Get notification counts
router.get('/counts', auth, async (req, res) => {
  try {
    const counts = await NotificationService.getNotificationCounts(req.user.id);

    res.json({
      success: true,
      counts
    });
  } catch (error) {
    console.error('Error fetching notification counts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification counts',
      error: error.message
    });
  }
});

// Mark notification as read
router.patch('/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await NotificationService.markNotificationAsRead(
      notificationId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'Notification not found' ? 'Notification not found' : 'Failed to mark notification as read',
      error: error.message
    });
  }
});

// Dismiss notification
router.patch('/:notificationId/dismiss', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    const notification = await NotificationService.dismissNotification(
      notificationId,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Notification dismissed',
      notification
    });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: error.message === 'Notification not found' ? 'Notification not found' : 'Failed to dismiss notification',
      error: error.message
    });
  }
});

// Mark all notifications as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    const notifications = await NotificationService.getUserNotifications(req.user.id, {
      unreadOnly: true
    });

    const promises = notifications.map(notification => 
      NotificationService.markNotificationAsRead(notification._id, req.user.id)
    );

    await Promise.all(promises);

    res.json({
      success: true,
      message: `Marked ${notifications.length} notifications as read`
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
});

// Admin endpoint to process pending notifications
router.post('/process-pending', auth, async (req, res) => {
  try {
    // In a real app, you'd want to secure this endpoint or run it as a scheduled job
    const processedCount = await NotificationService.processPendingNotifications();

    res.json({
      success: true,
      message: `Processed ${processedCount} pending notifications`
    });
  } catch (error) {
    console.error('Error processing pending notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process pending notifications',
      error: error.message
    });
  }
});

export default router;