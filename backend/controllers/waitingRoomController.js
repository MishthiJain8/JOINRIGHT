// Store waiting room participants in memory
const waitingRooms = new Map();

export const joinWaitingRoom = async (req, res) => {
  try {
    const { roomId, userId, userName } = req.body;
    
    if (!roomId || !userId || !userName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Initialize waiting room if it doesn't exist
    if (!waitingRooms.has(roomId)) {
      waitingRooms.set(roomId, {
        participants: [],
        isEnabled: true
      });
    }

    const waitingRoom = waitingRooms.get(roomId);
    
    // Check if user is already in waiting room
    const existingParticipant = waitingRoom.participants.find(p => p.userId === userId);
    if (!existingParticipant) {
      waitingRoom.participants.push({
        userId,
        userName,
        joinedAt: new Date(),
        status: 'waiting'
      });
    }

    res.json({
      success: true,
      message: 'Added to waiting room',
      waitingRoom: {
        participants: waitingRoom.participants.length,
        status: 'waiting'
      }
    });
  } catch (error) {
    console.error('Error joining waiting room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error joining waiting room' 
    });
  }
};

export const admitParticipant = async (req, res) => {
  try {
    const { roomId, userId, hostId } = req.body;
    
    if (!roomId || !userId || !hostId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    const waitingRoom = waitingRooms.get(roomId);
    if (!waitingRoom) {
      return res.status(404).json({ 
        success: false, 
        message: 'Waiting room not found' 
      });
    }

    // Find and admit participant
    const participantIndex = waitingRoom.participants.findIndex(p => p.userId === userId);
    if (participantIndex === -1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Participant not found in waiting room' 
      });
    }

    const participant = waitingRoom.participants[participantIndex];
    participant.status = 'admitted';
    participant.admittedAt = new Date();

    // Remove from waiting list
    waitingRoom.participants.splice(participantIndex, 1);

    res.json({
      success: true,
      message: 'Participant admitted successfully',
      participant: participant
    });
  } catch (error) {
    console.error('Error admitting participant:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error admitting participant' 
    });
  }
};

export const getWaitingRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    const waitingRoom = waitingRooms.get(roomId);
    if (!waitingRoom) {
      return res.json({
        success: true,
        waitingRoom: {
          participants: [],
          isEnabled: false
        }
      });
    }

    res.json({
      success: true,
      waitingRoom: {
        participants: waitingRoom.participants,
        isEnabled: waitingRoom.isEnabled
      }
    });
  } catch (error) {
    console.error('Error fetching waiting room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching waiting room' 
    });
  }
};

export const toggleWaitingRoom = async (req, res) => {
  try {
    const { roomId, isEnabled } = req.body;
    
    if (!roomId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Room ID is required' 
      });
    }

    // Initialize waiting room if it doesn't exist
    if (!waitingRooms.has(roomId)) {
      waitingRooms.set(roomId, {
        participants: [],
        isEnabled: isEnabled
      });
    } else {
      const waitingRoom = waitingRooms.get(roomId);
      waitingRoom.isEnabled = isEnabled;
    }

    res.json({
      success: true,
      message: `Waiting room ${isEnabled ? 'enabled' : 'disabled'}`,
      isEnabled: isEnabled
    });
  } catch (error) {
    console.error('Error toggling waiting room:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error toggling waiting room' 
    });
  }
};