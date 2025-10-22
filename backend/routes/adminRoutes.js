import express from 'express';
import { requireAdmin, requireAdminOrModerator } from '../middleware/adminAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import {
  getSystemStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  resetUserPassword,
  createUser,
  getActivityLogs,
  bulkUserOperation,
  getAllCyberScoreReviews,
  updateUserCyberScore,
  deleteCyberScoreReview,
  getUserCyberScoreDetails,
  getAllUserCyberScores,
  deleteUserMeetingHistory,
  cancelUserFutureMeetings,
  changeUserPassword,
  changeMeetingPassword,
  getUserMeetingHistory,
  debugMeetings
} from '../controllers/adminController.js';

const router = express.Router();

// Rate limiting for admin endpoints - Optimized for dashboard usage
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Increased from 100 to 300 for frequent dashboard refreshes
  message: 'Too many admin requests from this IP. Please wait before refreshing.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and stats (most common refresh endpoints)
    return req.path === '/api/admin/health' || req.path === '/api/admin/stats';
  }
});

// Apply rate limiting to all admin routes
router.use(adminRateLimit);

// System Statistics (Admin only)
router.get('/stats', requireAdmin, getSystemStats);

// User Management
router.get('/users', requireAdminOrModerator, getAllUsers);
router.get('/users/:userId', requireAdminOrModerator, getUserById);
router.post('/users', requireAdmin, createUser);
router.put('/users/:userId', requireAdmin, updateUser);
router.delete('/users/:userId', requireAdmin, deleteUser);
router.patch('/users/:userId/toggle-status', requireAdmin, toggleUserStatus);
router.patch('/users/:userId/reset-password', requireAdmin, resetUserPassword);

// Bulk Operations (Admin only)
router.post('/users/bulk-operation', requireAdmin, bulkUserOperation);

// Activity Logs (Admin only)
router.get('/logs', requireAdmin, getActivityLogs);

// Cyber Score Management (Admin only)
router.get('/cyber-scores/reviews', requireAdmin, getAllCyberScoreReviews);
router.get('/cyber-scores/bulk', requireAdminOrModerator, getAllUserCyberScores);
router.get('/cyber-scores/:userId', requireAdminOrModerator, getUserCyberScoreDetails);
router.put('/cyber-scores/:userId', requireAdmin, updateUserCyberScore);
router.delete('/cyber-scores/:userId/reviews/:reviewId', requireAdmin, deleteCyberScoreReview);

// Advanced User Operations (Admin only)
router.get('/users/:userId/meeting-history', requireAdmin, getUserMeetingHistory);
router.delete('/users/:userId/meeting-history', requireAdmin, deleteUserMeetingHistory);
router.post('/users/:userId/cancel-future-meetings', requireAdmin, cancelUserFutureMeetings);
router.post('/users/:userId/change-password', requireAdmin, changeUserPassword);
router.post('/meetings/:meetingId/change-password', requireAdmin, changeMeetingPassword);

// Debug endpoint (Admin only)
router.get('/debug/meetings', requireAdmin, debugMeetings);

// Health check for admin panel
router.get('/health', requireAdminOrModerator, (req, res) => {
  res.json({
    success: true,
    message: 'Admin panel is operational',
    timestamp: new Date().toISOString(),
    user: {
      id: req.user._id,
      email: req.user.email,
      role: req.user.role
    }
  });
});

export default router;