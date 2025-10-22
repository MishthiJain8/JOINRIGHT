import NotificationService from '../services/notificationService.js';
import logger from './logger.js';

class NotificationScheduler {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.interval = 60000; // Check every minute by default
  }

  start(intervalMs = 60000) {
    if (this.isRunning) {
      logger.warn('Notification scheduler is already running');
      return;
    }

    this.interval = intervalMs;
    this.isRunning = true;

    logger.info(`Starting notification scheduler with interval: ${intervalMs}ms`);

    // Process immediately on start
    this.processNotifications();

    // Set up interval
    this.intervalId = setInterval(() => {
      this.processNotifications();
    }, intervalMs);

    // Clean up old notifications daily (24 hours)
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldNotifications();
    }, 24 * 60 * 60 * 1000);
  }

  stop() {
    if (!this.isRunning) {
      logger.warn('Notification scheduler is not running');
      return;
    }

    logger.info('Stopping notification scheduler');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
  }

  async processNotifications() {
    try {
      const processedCount = await NotificationService.processPendingNotifications();
      
      if (processedCount > 0) {
        logger.info(`Processed ${processedCount} pending notifications`);
      }
    } catch (error) {
      logger.error('Error in notification scheduler:', error);
    }
  }

  async cleanupOldNotifications() {
    try {
      const cleanedCount = await NotificationService.cleanupOldNotifications(30); // 30 days
      
      if (cleanedCount > 0) {
        logger.info(`Cleaned up ${cleanedCount} old notifications`);
      }
    } catch (error) {
      logger.error('Error cleaning up old notifications:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      interval: this.interval,
      nextRun: this.intervalId ? new Date(Date.now() + this.interval) : null
    };
  }
}

export default new NotificationScheduler();