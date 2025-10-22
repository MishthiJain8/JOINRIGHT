import express from 'express';
import { authenticateToken as requireAuth } from '../middleware/auth.js';
import {
  startMeeting,
  getWaitingRoomParticipants,
  manageParticipantEntry,
  getMeetingParticipants,
  manageParticipant,
  submitCyberScoreRating,
  getUserCyberScore
} from '../controllers/meetingHostController.js';

const router = express.Router();

// All meeting host routes require authentication
router.use(requireAuth);

// Meeting host control routes
router.post('/:meetingId/start', startMeeting);
router.get('/:meetingId/waiting-room', getWaitingRoomParticipants);
router.post('/:meetingId/participants/:participantUserId/entry', manageParticipantEntry);
router.get('/:meetingId/participants', getMeetingParticipants);
router.post('/:meetingId/participants/:participantUserId/manage', manageParticipant);

// Cyber score management routes
router.post('/:meetingId/participants/:participantUserId/rating', submitCyberScoreRating);
router.get('/cyber-score/:userId', getUserCyberScore);

export default router;