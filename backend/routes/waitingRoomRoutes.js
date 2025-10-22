import express from 'express';
import { 
  joinWaitingRoom, 
  admitParticipant, 
  getWaitingRoom, 
  toggleWaitingRoom 
} from '../controllers/waitingRoomController.js';

const router = express.Router();

// Join waiting room
router.post('/join', joinWaitingRoom);

// Admit participant from waiting room
router.post('/admit', admitParticipant);

// Get waiting room participants
router.get('/:roomId', getWaitingRoom);

// Toggle waiting room on/off
router.post('/toggle', toggleWaitingRoom);

export default router;