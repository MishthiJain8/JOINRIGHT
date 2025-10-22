import User from '../models/user.js';
import CyberScore from '../models/CyberScore.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Get system statistics
export const getSystemStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      // User statistics
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'moderator' }),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }),
      
      // Database statistics
      mongoose.connection.db.stats(),
    ]);

    const systemStats = {
      users: {
        total: stats[0],
        active: stats[1],
        admins: stats[2],
        moderators: stats[3],
        verified: stats[4],
        newToday: stats[5],
        activeToday: stats[6]
      },
      database: {
        collections: stats[7].collections,
        dataSize: stats[7].dataSize,
        indexSize: stats[7].indexSize,
        storageSize: stats[7].storageSize
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV
      }
    };

    res.json({
      success: true,
      data: systemStats
    });
  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({
      error: 'Failed to retrieve system statistics',
      code: 'STATS_FETCH_FAILED'
    });
  }
};

// Get all users with pagination and filtering
export const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      role = '', 
      isActive = '',
      emailVerified = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (role) {
      query.role = role;
    }

    // Active status filter
    if (isActive !== '') {
      query.isActive = isActive === 'true';
    }

    // Email verification filter
    if (emailVerified !== '') {
      query.emailVerified = emailVerified === 'true';
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(query)
      .select('-password -otp')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalUsers: total,
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get all users error:', error);
    res.status(500).json({
      error: 'Failed to retrieve users',
      code: 'USERS_FETCH_FAILED'
    });
  }
};

// Get specific user by ID
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-password -otp');
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error('Get user by ID error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user',
      code: 'USER_FETCH_FAILED'
    });
  }
};

// Update user information
export const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;
    const adminUser = req.user;

    // Remove sensitive fields that shouldn't be updated directly
    delete updates.password;
    delete updates.otp;
    delete updates.otpExpires;

    // Only super admin can change roles
    if (updates.role && adminUser.role !== 'admin') {
      return res.status(403).json({
        error: 'Only administrators can change user roles',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId, 
      { ...updates, updatedAt: new Date() },
      { new: true, select: '-password -otp' }
    );

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    logger.info(`Admin ${adminUser.email} updated user ${user.email}`);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      code: 'USER_UPDATE_FAILED'
    });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent deleting other admins (unless super admin)
    if (user.role === 'admin' && adminUser._id.toString() !== userId) {
      return res.status(403).json({
        error: 'Cannot delete other administrator accounts',
        code: 'CANNOT_DELETE_ADMIN'
      });
    }

    await User.findByIdAndDelete(userId);

    logger.warn(`Admin ${adminUser.email} deleted user ${user.email}`);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      code: 'USER_DELETE_FAILED'
    });
  }
};

// Toggle user active status
export const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user;

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Prevent deactivating other admins
    if (user.role === 'admin' && adminUser._id.toString() !== userId) {
      return res.status(403).json({
        error: 'Cannot deactivate other administrator accounts',
        code: 'CANNOT_DEACTIVATE_ADMIN'
      });
    }

    const newStatus = !user.isActive;
    await User.findByIdAndUpdate(userId, { 
      isActive: newStatus, 
      updatedAt: new Date() 
    });

    const action = newStatus ? 'activated' : 'deactivated';
    logger.info(`Admin ${adminUser.email} ${action} user ${user.email}`);

    res.json({
      success: true,
      message: `User ${action} successfully`,
      data: { isActive: newStatus }
    });
  } catch (error) {
    logger.error('Toggle user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      code: 'USER_STATUS_UPDATE_FAILED'
    });
  }
};

// Reset user password
export const resetUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    const adminUser = req.user;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'INVALID_PASSWORD'
      });
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      loginAttempts: 0,
      lockUntil: null,
      updatedAt: new Date()
    });

    logger.warn(`Admin ${adminUser.email} reset password for user ${user.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      code: 'PASSWORD_RESET_FAILED'
    });
  }
};

// Create new user
export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role = 'user' } = req.body;
    const adminUser = req.user;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        error: 'User with this email already exists',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = new User({
      email: email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      role,
      isActive: true,
      emailVerified: true, // Admin created users are pre-verified
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newUser.save();

    logger.info(`Admin ${adminUser.email} created new user ${newUser.email}`);

    const userResponse = newUser.toObject();
    delete userResponse.password;
    delete userResponse.otp;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      code: 'USER_CREATE_FAILED'
    });
  }
};

// Get activity logs (simplified version)
export const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, userId = '', startDate = '', endDate = '' } = req.query;

    // This is a simplified version - in a production app, you'd want a separate logs collection
    const recentUsers = await User.find({})
      .select('email lastLogin createdAt updatedAt isActive role')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const activityLogs = recentUsers.map(user => ({
      userId: user._id,
      email: user.email,
      action: user.lastLogin ? 'LOGIN' : 'CREATED',
      timestamp: user.lastLogin || user.createdAt,
      details: {
        role: user.role,
        isActive: user.isActive
      }
    }));

    res.json({
      success: true,
      data: {
        logs: activityLogs,
        pagination: {
          currentPage: parseInt(page),
          limit: parseInt(limit)
        }
      }
    });
  } catch (error) {
    logger.error('Get activity logs error:', error);
    res.status(500).json({
      error: 'Failed to retrieve activity logs',
      code: 'LOGS_FETCH_FAILED'
    });
  }
};

// Bulk user operations
export const bulkUserOperation = async (req, res) => {
  try {
    const { operation, userIds, data = {} } = req.body;
    const adminUser = req.user;

    if (!operation || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        error: 'Invalid bulk operation request',
        code: 'INVALID_BULK_REQUEST'
      });
    }

    let result;
    switch (operation) {
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { isActive: true, updatedAt: new Date() }
        );
        break;
      
      case 'deactivate':
        // Prevent deactivating admins
        result = await User.updateMany(
          { _id: { $in: userIds }, role: { $ne: 'admin' } },
          { isActive: false, updatedAt: new Date() }
        );
        break;
      
      case 'delete':
        // Prevent deleting admins
        result = await User.deleteMany({ 
          _id: { $in: userIds }, 
          role: { $ne: 'admin' } 
        });
        break;
      
      case 'updateRole':
        if (!data.role) {
          return res.status(400).json({
            error: 'Role is required for bulk role update',
            code: 'MISSING_ROLE'
          });
        }
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { role: data.role, updatedAt: new Date() }
        );
        break;
      
      default:
        return res.status(400).json({
          error: 'Invalid bulk operation',
          code: 'INVALID_OPERATION'
        });
    }

    logger.info(`Admin ${adminUser.email} performed bulk operation: ${operation} on ${userIds.length} users`);

    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      data: {
        matchedCount: result.matchedCount || result.deletedCount || 0,
        modifiedCount: result.modifiedCount || result.deletedCount || 0
      }
    });
  } catch (error) {
    logger.error('Bulk user operation error:', error);
    res.status(500).json({
      error: 'Bulk operation failed',
      code: 'BULK_OPERATION_FAILED'
    });
  }
};

// Get all cyber score reviews across all users - OPTIMIZED VERSION
export const getAllCyberScoreReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, userId = '', hostId = '', sortBy = 'timestamp', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    logger.info('Fetching cyber score reviews with params:', { page: pageNum, limit: limitNum, userId, hostId, sortBy, sortOrder });

    // Build base match conditions
    const baseMatch = {};
    if (userId) {
      baseMatch.userId = new mongoose.Types.ObjectId(userId);
    }

    // Build pipeline with optimizations
    const pipeline = [];
    
    // Initial match for base document filtering
    if (Object.keys(baseMatch).length > 0) {
      pipeline.push({ $match: baseMatch });
    }
    
    // Unwind score history
    pipeline.push({ $unwind: '$scoreHistory' });
    
    // Additional filtering for host if specified
    if (hostId) {
      pipeline.push({
        $match: { 'scoreHistory.hostId': new mongoose.Types.ObjectId(hostId) }
      });
    }
    
    // Sort early to optimize performance
    pipeline.push({
      $sort: { 'scoreHistory.timestamp': sortOrder === 'desc' ? -1 : 1 }
    });
    
    // Count total before pagination (more efficient approach)
    const countPipeline = [...pipeline, { $count: 'total' }];
    
    // Add pagination to main pipeline
    pipeline.push(
      { $skip: (pageNum - 1) * limitNum },
      { $limit: limitNum }
    );
    
    // Optimize lookups by using fewer fields and letting MongoDB handle nulls
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'scoreHistory.hostId',
          foreignField: '_id',
          as: 'host',
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
        }
      }
    );
    
    // Final projection with simplified structure
    pipeline.push({
      $project: {
        userId: 1,
        currentScore: 1,
        reputationLevel: 1,
        review: {
          _id: '$scoreHistory._id',
          meetingId: '$scoreHistory.meetingId',
          scoreChange: '$scoreHistory.scoreChange',
          category: '$scoreHistory.category',
          reason: '$scoreHistory.reason',
          incidentType: '$scoreHistory.incidentType',
          timestamp: '$scoreHistory.timestamp',
          evidence: '$scoreHistory.evidence'
        },
        user: { $arrayElemAt: ['$user', 0] },
        host: { $arrayElemAt: ['$host', 0] }
      }
    });

    // Execute both queries concurrently for better performance
    const [reviews, countResult] = await Promise.all([
      CyberScore.aggregate(pipeline),
      CyberScore.aggregate(countPipeline)
    ]);
    
    const total = countResult.length > 0 ? countResult[0].total : 0;
    
    logger.info(`Found ${reviews.length} reviews out of ${total} total`);

    res.json({
      success: true,
      data: {
        reviews,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalReviews: total,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    logger.error('Get all cyber score reviews error:', error);
    res.status(500).json({
      error: 'Failed to retrieve cyber score reviews',
      code: 'CYBER_SCORE_REVIEWS_FETCH_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update user cyber score manually
export const updateUserCyberScore = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentScore, reason, category = 'overallParticipation' } = req.body;
    const adminUser = req.user;

    if (currentScore < 0 || currentScore > 100) {
      return res.status(400).json({
        error: 'Cyber score must be between 0 and 100',
        code: 'INVALID_SCORE_RANGE'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Reason for score change is required',
        code: 'MISSING_REASON'
      });
    }

    // Find or create cyber score document
    let cyberScore = await CyberScore.findOne({ userId });
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId });
    }

    const oldScore = cyberScore.currentScore;
    const scoreChange = currentScore - oldScore;

    // Add admin adjustment to score history
    cyberScore.addScoreChange({
      hostId: adminUser._id,
      scoreChange,
      category,
      reason: `Admin adjustment: ${reason}`,
      incidentType: scoreChange > 0 ? 'positive' : (scoreChange < 0 ? 'minor_violation' : 'neutral'),
      evidence: {
        notes: `Manual score update by admin ${adminUser.email}`
      }
    });

    // Set the exact score (override calculated score)
    cyberScore.currentScore = currentScore;
    cyberScore.updateReputationLevel();

    await cyberScore.save();

    logger.info(`Admin ${adminUser.email} updated cyber score for user ${userId} from ${oldScore} to ${currentScore}`);

    res.json({
      success: true,
      message: 'Cyber score updated successfully',
      data: {
        userId,
        oldScore,
        newScore: currentScore,
        scoreChange,
        reputationLevel: cyberScore.reputationLevel
      }
    });
  } catch (error) {
    logger.error('Update user cyber score error:', error);
    res.status(500).json({
      error: 'Failed to update cyber score',
      code: 'CYBER_SCORE_UPDATE_FAILED'
    });
  }
};

// Delete a specific cyber score review
export const deleteCyberScoreReview = async (req, res) => {
  try {
    const { userId, reviewId } = req.params;
    const adminUser = req.user;

    const cyberScore = await CyberScore.findOne({ userId });
    if (!cyberScore) {
      return res.status(404).json({
        error: 'User cyber score not found',
        code: 'CYBER_SCORE_NOT_FOUND'
      });
    }

    const reviewIndex = cyberScore.scoreHistory.findIndex(
      review => review._id.toString() === reviewId
    );

    if (reviewIndex === -1) {
      return res.status(404).json({
        error: 'Review not found',
        code: 'REVIEW_NOT_FOUND'
      });
    }

    const deletedReview = cyberScore.scoreHistory[reviewIndex];
    const scoreChangeToReverse = deletedReview.scoreChange;

    // Remove the review from history
    cyberScore.scoreHistory.splice(reviewIndex, 1);

    // Reverse the score change
    cyberScore.currentScore = Math.max(0, Math.min(100, cyberScore.currentScore - scoreChangeToReverse));
    
    // Update behavior metrics if applicable
    if (cyberScore.behaviorMetrics[deletedReview.category] !== undefined) {
      cyberScore.behaviorMetrics[deletedReview.category] = Math.max(0, Math.min(100, 
        cyberScore.behaviorMetrics[deletedReview.category] - scoreChangeToReverse
      ));
    }

    // Update meeting stats
    if (deletedReview.incidentType === 'positive') {
      cyberScore.meetingStats.positiveReviews = Math.max(0, cyberScore.meetingStats.positiveReviews - 1);
    } else if (['minor_violation', 'major_violation', 'severe_violation'].includes(deletedReview.incidentType)) {
      cyberScore.meetingStats.negativeReviews = Math.max(0, cyberScore.meetingStats.negativeReviews - 1);
    }

    cyberScore.updateReputationLevel();
    cyberScore.updatedAt = new Date();

    await cyberScore.save();

    logger.warn(`Admin ${adminUser.email} deleted cyber score review ${reviewId} for user ${userId}`);

    res.json({
      success: true,
      message: 'Review deleted successfully',
      data: {
        deletedReview: {
          _id: deletedReview._id,
          reason: deletedReview.reason,
          scoreChange: deletedReview.scoreChange,
          timestamp: deletedReview.timestamp
        },
        newScore: cyberScore.currentScore,
        newReputationLevel: cyberScore.reputationLevel
      }
    });
  } catch (error) {
    logger.error('Delete cyber score review error:', error);
    res.status(500).json({
      error: 'Failed to delete review',
      code: 'REVIEW_DELETE_FAILED'
    });
  }
};

// Delete user's meeting history
export const deleteUserMeetingHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Import Meeting model at the top of the file if not already imported
    const Meeting = mongoose.models.Meeting || mongoose.model('Meeting');
    
    // Delete all meetings where user was a participant or host
    const deletedMeetings = await Meeting.deleteMany({
      $or: [
        { hostId: userId },
        { 'participants.userId': userId }
      ]
    });

    // Also delete from meeting participants collection if it exists
    try {
      const MeetingParticipant = mongoose.models.MeetingParticipant || mongoose.model('MeetingParticipant');
      await MeetingParticipant.deleteMany({ userId });
    } catch (err) {
      console.warn('MeetingParticipant model not found, skipping...');
    }

    logger.warn(`Admin ${adminUser.email} deleted meeting history for user ${user.email} (${deletedMeetings.deletedCount} meetings)`);

    res.json({
      success: true,
      message: 'Meeting history deleted successfully',
      data: {
        deletedMeetings: deletedMeetings.deletedCount,
        userEmail: user.email
      }
    });
  } catch (error) {
    logger.error('Delete user meeting history error:', error);
    res.status(500).json({
      error: 'Failed to delete meeting history',
      code: 'MEETING_HISTORY_DELETE_FAILED'
    });
  }
};

// Cancel future meetings for a user
export const cancelUserFutureMeetings = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUser = req.user;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const Meeting = mongoose.models.Meeting || mongoose.model('Meeting');
    const now = new Date();
    
    // Cancel all future meetings where user is host or participant
    const futureMeetings = await Meeting.find({
      $or: [
        { hostId: userId },
        { 'participants.userId': userId }
      ],
      scheduledAt: { $gt: now }
    });

    // Update meetings to cancelled status
    const cancelledMeetings = await Meeting.updateMany(
      {
        $or: [
          { hostId: userId },
          { 'participants.userId': userId }
        ],
        scheduledAt: { $gt: now }
      },
      {
        status: 'cancelled',
        cancelledBy: adminUser._id,
        cancelledAt: new Date(),
        cancelReason: `Cancelled by admin: ${adminUser.email}`
      }
    );

    logger.warn(`Admin ${adminUser.email} cancelled ${cancelledMeetings.modifiedCount} future meetings for user ${user.email}`);

    res.json({
      success: true,
      message: 'Future meetings cancelled successfully',
      data: {
        cancelledCount: cancelledMeetings.modifiedCount,
        userEmail: user.email,
        meetings: futureMeetings.map(m => ({
          id: m._id,
          title: m.title,
          scheduledTime: m.scheduledAt
        }))
      }
    });
  } catch (error) {
    logger.error('Cancel user future meetings error:', error);
    res.status(500).json({
      error: 'Failed to cancel future meetings',
      code: 'FUTURE_MEETINGS_CANCEL_FAILED'
    });
  }
};

// Change user password (admin override)
export const changeUserPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { newPassword, reason } = req.body;
    const adminUser = req.user;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long',
        code: 'INVALID_PASSWORD'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Reason for password change is required',
        code: 'MISSING_REASON'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    await User.findByIdAndUpdate(userId, {
      password: hashedPassword,
      loginAttempts: 0,
      lockUntil: null,
      passwordChangedAt: new Date(),
      passwordChangedBy: adminUser._id,
      updatedAt: new Date()
    });

    logger.warn(`Admin ${adminUser.email} changed password for user ${user.email}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: {
        userEmail: user.email,
        changedBy: adminUser.email,
        changedAt: new Date(),
        reason
      }
    });
  } catch (error) {
    logger.error('Change user password error:', error);
    res.status(500).json({
      error: 'Failed to change password',
      code: 'PASSWORD_CHANGE_FAILED'
    });
  }
};

// Get user's meeting history summary
export const getUserMeetingHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select('email firstName lastName');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const Meeting = mongoose.models.Meeting || mongoose.model('Meeting');
    
    logger.info(`Fetching meeting history for user ${userId} (${user.email})`);
    
    // Debug: Check if Meeting model is properly loaded
    if (!Meeting) {
      throw new Error('Meeting model not found');
    }
    
    // Get all meetings (past and future) - including various participant scenarios
    const allMeetings = await Meeting.find({
      $or: [
        { hostId: userId },
        { 'participants.userId': userId },
        { participants: { $in: [userId] } }, // Legacy participant format
        { 'activeParticipants.userId': userId },
        { 'waitingRoom.participants.userId': userId },
        { coHosts: { $in: [userId] } }
      ]
    }).sort({ scheduledAt: -1, createdAt: -1 }).limit(100); // Increased limit and added fallback sort

    const now = new Date();
    // For meetings without scheduledAt, use createdAt or consider them as past meetings
    const pastMeetings = allMeetings.filter(m => {
      if (m.scheduledAt) {
        return new Date(m.scheduledAt) < now;
      }
      // If no scheduledAt but has ended date, it's past
      if (m.endedAt) {
        return true;
      }
      // If status indicates it's ended, it's past
      if (m.status === 'ended') {
        return true;
      }
      // If created more than 24 hours ago and no scheduled date, likely past
      if (m.createdAt && (now - new Date(m.createdAt)) > 24 * 60 * 60 * 1000) {
        return true;
      }
      return false;
    });
    
    const futureMeetings = allMeetings.filter(m => {
      if (m.scheduledAt) {
        return new Date(m.scheduledAt) >= now;
      }
      // If no scheduledAt but status is scheduled, it might be future
      if (m.status === 'scheduled' && !m.endedAt) {
        return true;
      }
      return false;
    });
    
    logger.info(`Meeting stats for user ${user.email}: Total=${allMeetings.length}, Past=${pastMeetings.length}, Future=${futureMeetings.length}`);
    
    // Debug: Log some meeting details
    if (allMeetings.length > 0) {
      logger.debug(`Sample meeting: ${JSON.stringify({
        id: allMeetings[0]._id,
        title: allMeetings[0].title,
        scheduledAt: allMeetings[0].scheduledAt,
        status: allMeetings[0].status,
        createdAt: allMeetings[0].createdAt
      })}`);
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        summary: {
          totalMeetings: allMeetings.length,
          pastMeetings: pastMeetings.length,
          futureMeetings: futureMeetings.length
        },
        recentMeetings: allMeetings.slice(0, 10).map(m => {
          const meetingDate = m.scheduledAt || m.startedAt || m.createdAt;
          const isPastMeeting = m.scheduledAt 
            ? new Date(m.scheduledAt) < now 
            : (m.endedAt || m.status === 'ended' || (m.createdAt && (now - new Date(m.createdAt)) > 24 * 60 * 60 * 1000));
          
          return {
            id: m._id,
            title: m.title || 'Untitled Meeting',
            scheduledTime: meetingDate,
            status: m.status || 'completed',
            isHost: m.hostId.toString() === userId,
            isPast: isPastMeeting
          };
        })
      }
    });
  } catch (error) {
    logger.error('Get user meeting history error:', error);
    res.status(500).json({
      error: 'Failed to retrieve meeting history',
      code: 'MEETING_HISTORY_FETCH_FAILED'
    });
  }
};

// Change meeting password (admin override)
export const changeMeetingPassword = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { newPassword, reason } = req.body;
    const adminUser = req.user;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        error: 'Meeting password must be at least 6 characters long',
        code: 'INVALID_MEETING_PASSWORD'
      });
    }

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: 'Reason for meeting password change is required',
        code: 'MISSING_REASON'
      });
    }

    const Meeting = mongoose.models.Meeting || mongoose.model('Meeting');
    const meeting = await Meeting.findById(meetingId)
      .populate('hostId', 'email firstName lastName');
    
    if (!meeting) {
      return res.status(404).json({
        error: 'Meeting not found',
        code: 'MEETING_NOT_FOUND'
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update meeting with new password
    await Meeting.findByIdAndUpdate(meetingId, {
      password: hashedPassword,
      passwordChangedAt: new Date(),
      passwordChangedBy: adminUser._id,
      passwordChangeReason: reason,
      updatedAt: new Date()
    });

    logger.warn(`Admin ${adminUser.email} changed password for meeting ${meeting.title || meetingId} (host: ${meeting.hostId.email}). Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Meeting password changed successfully',
      data: {
        meetingId: meeting._id,
        meetingTitle: meeting.title || 'Untitled Meeting',
        hostEmail: meeting.hostId.email,
        changedBy: adminUser.email,
        changedAt: new Date(),
        reason
      }
    });
  } catch (error) {
    logger.error('Change meeting password error:', error);
    res.status(500).json({
      error: 'Failed to change meeting password',
      code: 'MEETING_PASSWORD_CHANGE_FAILED'
    });
  }
};

// Debug endpoint to check meeting data structure
export const debugMeetings = async (req, res) => {
  try {
    const Meeting = mongoose.models.Meeting || mongoose.model('Meeting');
    
    // Get total count
    const totalCount = await Meeting.countDocuments();
    
    // Get sample meetings
    const sampleMeetings = await Meeting.find()
      .limit(5)
      .select('title scheduledAt status hostId participants createdAt');
    
    // Get meetings with different structures
    const withScheduledAt = await Meeting.countDocuments({ scheduledAt: { $exists: true } });
    const withParticipants = await Meeting.countDocuments({ participants: { $exists: true, $ne: [] } });
    const withHostId = await Meeting.countDocuments({ hostId: { $exists: true } });
    
    res.json({
      success: true,
      debug: {
        totalMeetings: totalCount,
        withScheduledAt,
        withParticipants,
        withHostId,
        sampleMeetings: sampleMeetings.map(m => ({
          id: m._id,
          title: m.title,
          scheduledAt: m.scheduledAt,
          status: m.status,
          hostId: m.hostId,
          participantsCount: m.participants ? m.participants.length : 0,
          createdAt: m.createdAt
        }))
      }
    });
  } catch (error) {
    logger.error('Debug meetings error:', error);
    res.status(500).json({
      error: 'Failed to debug meetings',
      details: error.message
    });
  }
};

// Get user's full cyber score details for admin view
export const getUserCyberScoreDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const cyberScore = await CyberScore.findOne({ userId })
      .populate('userId', 'email firstName lastName')
      .populate('scoreHistory.hostId', 'email firstName lastName');

    if (!cyberScore) {
      return res.status(404).json({
        error: 'User cyber score not found',
        code: 'CYBER_SCORE_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      data: cyberScore
    });
  } catch (error) {
    logger.error('Get user cyber score details error:', error);
    res.status(500).json({
      error: 'Failed to retrieve cyber score details',
      code: 'CYBER_SCORE_DETAILS_FETCH_FAILED'
    });
  }
};

// Get all user cyber scores in bulk (optimized for admin dashboard)
export const getAllUserCyberScores = async (req, res) => {
  try {
    const { page = 1, limit = 50, sortBy = 'currentScore', sortOrder = 'desc' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    
    logger.info('Fetching all user cyber scores:', { page: pageNum, limit: limitNum, sortBy, sortOrder });

    // Validate sort parameters
    const validSortFields = ['currentScore', 'reputationLevel', 'updatedAt'];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'currentScore';
    const safeSortOrder = sortOrder === 'asc' ? 1 : -1;
    
    // Build sort object
    const sortObject = {};
    sortObject[safeSortBy] = safeSortOrder;

    // Get total count first
    const totalCount = await CyberScore.countDocuments({});
    
    if (totalCount === 0) {
      logger.info('No cyber scores found in database');
      return res.json({
        success: true,
        data: {
          userScores: [],
          pagination: {
            currentPage: pageNum,
            totalPages: 0,
            totalUsers: 0,
            limit: limitNum
          }
        }
      });
    }
    
    // Use a simpler approach with populate
    const cyberScores = await CyberScore.find({})
      .populate({
        path: 'userId',
        select: 'firstName lastName email isActive',
        match: { _id: { $exists: true } } // Only populated if user exists
      })
      .sort(sortObject)
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean();
    
    logger.info(`Retrieved ${cyberScores.length} cyber scores from database`);
    
    // Transform data to match expected format
    const userScores = cyberScores
      .filter(score => score.userId) // Only include scores with valid users
      .map(score => {
        try {
          return {
            userId: score.userId._id,
            currentScore: score.currentScore || 85,
            reputationLevel: score.reputationLevel || 'average',
            meetingStats: score.meetingStats || {
              totalMeetingsAttended: 0,
              positiveReviews: 0,
              negativeReviews: 0
            },
            restrictions: {
              temporaryBan: {
                isActive: score.restrictions?.temporaryBan?.isActive || false
              }
            },
            scoreHistoryCount: score.scoreHistory ? score.scoreHistory.length : 0,
            user: {
              _id: score.userId._id,
              firstName: score.userId.firstName || 'Unknown',
              lastName: score.userId.lastName || 'User',
              email: score.userId.email || 'no-email@example.com',
              isActive: score.userId.isActive !== undefined ? score.userId.isActive : true
            },
            updatedAt: score.updatedAt || new Date()
          };
        } catch (transformError) {
          logger.warn('Error transforming cyber score:', transformError.message);
          return null;
        }
      })
      .filter(Boolean); // Remove any null entries
    
    logger.info(`Found ${userScores.length} user scores out of ${totalCount} total`);

    res.json({
      success: true,
      data: {
        userScores,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalCount / limitNum),
          totalUsers: totalCount,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    logger.error('Get all user cyber scores error:', error);
    res.status(500).json({
      error: 'Failed to retrieve user cyber scores',
      code: 'USER_CYBER_SCORES_FETCH_FAILED',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
