import express from 'express';
import {
  getUserCyberScore,
  getUserTrustIndicator,
  rateUser,
  awardPositiveReview,
  getAwardTypes,
  getUserIncidentHistory,
  getIncidentTypes,
  getBulkCyberScores,
  checkAdmissionEligibility,
  getAdmissionStats
} from '../controllers/cyberScoreController.js';

const router = express.Router();

// Get user's own cyber score (full details)
router.get('/user/:userId', getUserCyberScore);

// Get user's trust indicator (limited info for hosts)
router.get('/trust/:userId', getUserTrustIndicator);

// Rate a user (host only)
router.post('/rate/:userId', rateUser);

// Award positive review to increase cyber score (host only)
router.post('/award/:userId', awardPositiveReview);

// Get available award types for positive reviews
router.get('/award-types', getAwardTypes);

// Get user's incident history
router.get('/history/:userId', getUserIncidentHistory);

// Get available incident types and score levels
router.get('/incident-types', getIncidentTypes);

// Bulk get cyber scores for multiple users
router.post('/bulk', getBulkCyberScores);

// Check admission eligibility
router.post('/check-admission', checkAdmissionEligibility);

// Get admission statistics for host
router.get('/admission-stats/:hostId', getAdmissionStats);

export default router;
