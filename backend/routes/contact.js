import express from 'express';
import ContactMessage from '../models/ContactMessage.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = express.Router();

// Submit contact form (public endpoint)
router.post('/submit', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      });
    }

    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate subject
    const validSubjects = ['technical-support', 'billing', 'feature-request', 'partnership', 'general'];
    if (!validSubjects.includes(subject)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid subject'
      });
    }

    // Create new contact message
    const contactMessage = new ContactMessage({
      name: name.trim(),
      email: email.trim(),
      subject,
      message: message.trim()
    });

    await contactMessage.save();

    res.status(201).json({
      success: true,
      message: 'Contact message submitted successfully',
      data: {
        id: contactMessage._id,
        submittedAt: contactMessage.submittedAt
      }
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit contact message'
    });
  }
});

// Get all contact messages (admin only)
router.get('/messages', requireAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};
    if (status && ['new', 'read', 'replied', 'resolved'].includes(status)) {
      query.status = status;
    }

    // Get messages with pagination
    const messages = await ContactMessage.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count
    const total = await ContactMessage.countDocuments(query);

    // Get status counts
    const statusCounts = await ContactMessage.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusSummary = {
      new: 0,
      read: 0,
      replied: 0,
      resolved: 0
    };

    statusCounts.forEach(item => {
      statusSummary[item._id] = item.count;
    });

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        statusSummary
      }
    });

  } catch (error) {
    console.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contact messages'
    });
  }
});

// Get single contact message (admin only)
router.get('/messages/:id', requireAdmin, async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Contact message not found'
      });
    }

    // Mark as read if it's new
    if (message.status === 'new') {
      message.status = 'read';
      await message.save();
    }

    res.json({
      success: true,
      data: message
    });

  } catch (error) {
    console.error('Get contact message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve contact message'
    });
  }
});

// Update contact message status (admin only)
router.patch('/messages/:id', requireAdmin, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Contact message not found'
      });
    }

    // Validate status
    if (status && !['new', 'read', 'replied', 'resolved'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status'
      });
    }

    // Update fields
    if (status) {
      message.status = status;
    }
    if (adminNotes !== undefined) {
      message.adminNotes = adminNotes;
    }

    await message.save();

    res.json({
      success: true,
      message: 'Contact message updated successfully',
      data: message
    });

  } catch (error) {
    console.error('Update contact message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update contact message'
    });
  }
});

// Delete contact message (admin only)
router.delete('/messages/:id', requireAdmin, async (req, res) => {
  try {
    const message = await ContactMessage.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Contact message not found'
      });
    }

    res.json({
      success: true,
      message: 'Contact message deleted successfully'
    });

  } catch (error) {
    console.error('Delete contact message error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete contact message'
    });
  }
});

export default router;
