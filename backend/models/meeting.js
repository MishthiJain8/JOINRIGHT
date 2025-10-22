import mongoose from "mongoose";

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  password: { type: String, required: true },
  // link field removed - no longer using direct join links
  meetingId: { type: String, required: true, unique: true },
  creator: { type: String, required: true }, // Host/Creator email
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Host user ID
  description: { type: String, default: '' },
  status: { type: String, enum: ['scheduled', 'waiting_for_host', 'ongoing', 'ended'], default: 'scheduled' },
  
  // Host control settings
  hostControls: {
    requireHostApproval: { type: Boolean, default: true },
    allowParticipantsToJoinBeforeHost: { type: Boolean, default: false },
    autoAdmitRegisteredUsers: { type: Boolean, default: false },
    maxParticipants: { type: Number, default: 100 },
    enableWaitingRoom: { type: Boolean, default: true }
  },
  
  // Co-hosts who can also control the meeting
  coHosts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  
  participants: [{ type: String }], // Legacy - kept for backward compatibility
  activeParticipants: [{ 
    userId: String,
    joinedAt: { type: Date, default: Date.now },
    leftAt: Date
  }],
  
  // Waiting room participants
  waitingRoom: {
    participants: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      requestedAt: { type: Date, default: Date.now },
      cyberScore: {
        score: Number,
        level: String,
        totalMeetings: Number,
        isRestricted: Boolean
      }
    }]
  },
  
  scheduledAt: { type: Date, required: false }, // Optional - only for notifications/reminders
  startedAt: Date,
  endedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  chatHistory: [
    {
      sender: String,
      message: String,
      type: { type: String, enum: ['text', 'file', 'image'], default: 'text' },
      time: { type: Date, default: Date.now },
    },
  ],
  recordings: [
    {
      fileName: String,
      filePath: String,
      duration: Number,
      size: Number,
      createdAt: { type: Date, default: Date.now },
    },
  ],
  settings: {
    allowScreenShare: { type: Boolean, default: true },
    allowChat: { type: Boolean, default: true },
    allowRecording: { type: Boolean, default: true },
    waitingRoom: { type: Boolean, default: false },
    muteOnEntry: { type: Boolean, default: false }
  }
});

// Helper method to check if user is host or co-host
meetingSchema.methods.isHostOrCoHost = function(userId) {
  return this.hostId.equals(userId) || this.coHosts.includes(userId);
};

// Helper method to add participant to waiting room
meetingSchema.methods.addToWaitingRoom = function(userId, cyberScoreData) {
  const existingIndex = this.waitingRoom.participants.findIndex(p => p.userId.equals(userId));
  
  if (existingIndex === -1) {
    this.waitingRoom.participants.push({
      userId,
      requestedAt: new Date(),
      cyberScore: cyberScoreData
    });
  }
  
  this.updatedAt = new Date();
};

// Helper method to remove participant from waiting room
meetingSchema.methods.removeFromWaitingRoom = function(userId) {
  this.waitingRoom.participants = this.waitingRoom.participants.filter(
    p => !p.userId.equals(userId)
  );
  this.updatedAt = new Date();
};

// Helper method to check if meeting can be started
meetingSchema.methods.canBeStarted = function(userId) {
  // Only host or co-hosts can start the meeting
  return this.isHostOrCoHost(userId) && this.status === 'scheduled';
};

export default mongoose.model("Meeting", meetingSchema);
