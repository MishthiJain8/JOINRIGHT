import { v4 as uuidv4 } from 'uuid';

// Store breakout rooms in memory (use Redis in production)
const breakoutRooms = new Map();

export const createBreakoutRooms = async (req, res) => {
  try {
    const { mainRoomId, numberOfRooms, participants } = req.body;
    
    if (!mainRoomId || !numberOfRooms || !participants) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Create breakout rooms
    const rooms = [];
    for (let i = 0; i < numberOfRooms; i++) {
      const roomId = uuidv4();
      rooms.push({
        id: roomId,
        name: `Breakout Room ${i + 1}`,
        participants: [],
        createdAt: new Date()
      });
    }

    // Distribute participants automatically
    participants.forEach((participant, index) => {
      const roomIndex = index % numberOfRooms;
      rooms[roomIndex].participants.push(participant);
    });

    breakoutRooms.set(mainRoomId, {
      mainRoom: mainRoomId,
      rooms: rooms,
      createdAt: new Date(),
      isActive: true
    });

    res.json({
      success: true,
      breakoutRooms: rooms
    });
  } catch (error) {
    console.error('Error creating breakout rooms:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating breakout rooms' 
    });
  }
};

export const getBreakoutRooms = async (req, res) => {
  try {
    const { mainRoomId } = req.params;
    
    const breakoutData = breakoutRooms.get(mainRoomId);
    if (!breakoutData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Breakout rooms not found' 
      });
    }

    res.json({
      success: true,
      breakoutRooms: breakoutData.rooms
    });
  } catch (error) {
    console.error('Error fetching breakout rooms:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching breakout rooms' 
    });
  }
};

export const joinBreakoutRoom = async (req, res) => {
  try {
    const { mainRoomId, breakoutRoomId, userId } = req.body;
    
    const breakoutData = breakoutRooms.get(mainRoomId);
    if (!breakoutData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Breakout rooms not found' 
      });
    }

    const room = breakoutData.rooms.find(r => r.id === breakoutRoomId);
    if (!room) {
      return res.status(404).json({ 
        success: false, 
        message: 'Breakout room not found' 
      });
    }

    // Add user to breakout room if not already there
    if (!room.participants.find(p => p.userId === userId)) {
      room.participants.push({ userId, joinedAt: new Date() });
    }

    res.json({
      success: true,
      message: 'Joined breakout room successfully',
      room: room
    });
  } catch (error) {
    console.error('Error joining breakout room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error joining breakout room' 
    });
  }
};

export const closeBreakoutRooms = async (req, res) => {
  try {
    const { mainRoomId } = req.body;
    
    const breakoutData = breakoutRooms.get(mainRoomId);
    if (!breakoutData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Breakout rooms not found' 
      });
    }

    // Close all breakout rooms
    breakoutData.isActive = false;
    
    res.json({
      success: true,
      message: 'Breakout rooms closed successfully'
    });
  } catch (error) {
    console.error('Error closing breakout rooms:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error closing breakout rooms' 
    });
  }
};