import express from 'express';
import { 
  createBreakoutRooms, 
  getBreakoutRooms, 
  joinBreakoutRoom, 
  closeBreakoutRooms 
} from '../controllers/breakoutController.js';

const router = express.Router();

// Create breakout rooms
router.post('/create', createBreakoutRooms);

// Get breakout rooms for a main room
router.get('/:mainRoomId', getBreakoutRooms);

// Join a specific breakout room
router.post('/join', joinBreakoutRoom);

// Close all breakout rooms
router.post('/close', closeBreakoutRooms);

export default router;