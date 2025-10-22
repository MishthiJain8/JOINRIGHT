import express from 'express';
import User from '../models/user.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();


// Get user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -otp -resetPasswordToken -resetPasswordExpiry');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve profile'
    });
  }
});

// Update user profile
router.put('/update', authenticateToken, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      bio,
      company,
      position
    } = req.body;

    // Validate input
    if (firstName && typeof firstName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'First name must be a string'
      });
    }

    if (lastName && typeof lastName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Last name must be a string'
      });
    }

    if (phone && typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Phone must be a string'
      });
    }

    if (bio && typeof bio !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Bio must be a string'
      });
    }

    if (company && typeof company !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Company must be a string'
      });
    }

    if (position && typeof position !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Position must be a string'
      });
    }

    // Update user profile
    const updateData = {};
    
    if (firstName !== undefined) updateData.firstName = firstName.trim();
    if (lastName !== undefined) updateData.lastName = lastName.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (bio !== undefined) updateData.bio = bio.trim();
    if (company !== undefined) updateData.company = company.trim();
    if (position !== undefined) updateData.position = position.trim();

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { 
        new: true,
        runValidators: true
      }
    ).select('-password -otp -resetPasswordToken -resetPasswordExpiry');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: errors.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    });
  }
});

// Update password
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters long'
      });
    }

    // Update password
    user.password = newPassword;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
});

// Delete account
router.delete('/delete', authenticateToken, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: 'Password is required to delete account'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: 'Password is incorrect'
      });
    }

    // Soft delete - deactivate account instead of permanent deletion
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Account has been deactivated successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete account'
    });
  }
});

export default router;