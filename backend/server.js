import express from "express";
import mongoose from "mongoose";
import connectDB, { checkDBHealth } from './config/db.js';
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import signupRoutes from "./routes/signuproute.js";
import loginRoutes from "./routes/loginroute.js";
import meetingRoutes from "./routes/meetingroute.js";
import fileRoutes from "./routes/fileRoutes.js";
import breakoutRoutes from "./routes/breakoutRoutes.js";
import waitingRoomRoutes from "./routes/waitingRoomRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import contactRoutes from "./routes/contact.js";
import profileRoutes from "./routes/profileRoutes.js";
import meetingHostRoutes from "./routes/meetingHostRoutes.js";
import notificationRoutes from "./routes/notifications.js";
import cyberScoreRoutes from "./routes/cyberScoreRoutes.js";
import notificationScheduler from "./utils/notificationScheduler.js";
import { createServer } from "http";
import { Server } from "socket.io";
import logger from "./utils/logger.js";
import CyberScore from "./models/CyberScore.js";
import MeetingAnalyticsService from "./services/meetingAnalyticsService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for Socket.IO compatibility
  crossOriginEmbedderPolicy: false
}));

// Rate limiting - More lenient for admin dashboards
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Increased from 100 to 200 for admin dashboards
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks to prevent dashboard failures
    return req.path === '/api/health' || req.path === '/api/admin/health';
  }
});
app.use(limiter);

// Connection optimization for rapid requests
app.use((req, res, next) => {
  // Enable keep-alive for better connection reuse
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=5, max=1000');
  
  // Add cache headers for admin endpoints to reduce redundant requests
  if (req.path.startsWith('/api/admin/health')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else if (req.path.startsWith('/api/admin/')) {
    res.setHeader('Cache-Control', 'private, max-age=30'); // 30 seconds cache for admin data
  }
  
  next();
});

// Body parsing middleware
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.MAX_FILE_SIZE || '50mb' }));

// CORS configuration - Optimized for multiple refresh requests
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "http://localhost:3000", 
    process.env.FRONTEND_URL_ALT || "http://localhost:3001",
    "http://localhost:3000",  // React dev server default
    "http://localhost:3001",  // React dev server alternate
    "http://localhost:5000",  // Backup
    "http://localhost:5001"   // Backup
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With', 'X-Session-ID'],
  optionsSuccessStatus: 200, // IE11 support
  preflightContinue: false
}));

// Serve static files (recordings, uploads)
app.use('/recordings', express.static(path.join(__dirname, 'recordings')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to MongoDB
connectDB();

// API Routes
app.use("/api/signup", signupRoutes);
app.use("/api/login", loginRoutes);
app.use("/api/meetings", meetingRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/breakout", breakoutRoutes);
app.use("/api/waiting-room", waitingRoomRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/meeting-host", meetingHostRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/cyber-score", cyberScoreRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await checkDBHealth();
    
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: dbHealth,
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Create HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*" }, // allow frontend requests
});

// Attach io to app so controllers can access it
app.set('io', io);

// Store room information
const rooms = new Map();

// Store waiting room information
const waitingRooms = new Map();

// Helper function to get or create user cyber score
const getUserCyberScore = async (userId) => {
  try {
    let cyberScore = await CyberScore.findOne({ userId });
    if (!cyberScore) {
      cyberScore = new CyberScore({ userId });
      await cyberScore.save();
    }
    return {
      currentScore: cyberScore.currentScore,
      reputationLevel: cyberScore.reputationLevel,
      isRestricted: cyberScore.isCurrentlyRestricted(),
      totalMeetings: cyberScore.meetingStats.totalMeetingsAttended
    };
  } catch (error) {
    console.error('Error fetching cyber score:', error);
    // Return default values
    return {
      currentScore: 85,
      reputationLevel: 'good',
      isRestricted: false,
      totalMeetings: 0
    };
  }
};

// Socket.IO signaling
io.on("connection", (socket) => {
  logger.info(`⚡ User connected: ${socket.id}`);
  console.log("⚡ User connected: ", socket.id);
  
  
  // Handle connection errors
  socket.on('error', (error) => {
    logger.error('Socket error:', { socketId: socket.id, error });
  });

  // Function to handle admitting participant to meeting
  const admitParticipantToMeeting = (admittedSocket) => {
    const roomId = admittedSocket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Join the actual room
    admittedSocket.join(roomId);
    
    // Add to participants
    room.participants.set(admittedSocket.id, {
      userId: admittedSocket.userId,
      userName: admittedSocket.userName,
      joinedAt: new Date(),
      isVideoOn: true,
      isAudioOn: true
    });
    
    // Track meeting join for cyber score analytics
    MeetingAnalyticsService.trackMeetingJoin(admittedSocket.userId, roomId);
    
    logger.info(`User admitted and joined room`, { 
      userName: admittedSocket.userName, 
      userId: admittedSocket.userId, 
      roomId, 
      socketId: admittedSocket.id 
    });
    
    // Notify others that user joined
    const isHost = room && room.host === admittedSocket.id;
    
    // Get user's cyber score for the event
    getUserCyberScore(admittedSocket.userId).then(cyberScore => {
      admittedSocket.to(roomId).emit("user-connected", {
        userId: admittedSocket.userId,
        userName: admittedSocket.userName,
        socketId: admittedSocket.id,
        isHost: isHost,
        cyberScore
      });
    });
    
    // Send existing participants to new user
    const existingUsers = Array.from(room.participants.entries())
      .filter(([socketId]) => socketId !== admittedSocket.id)
      .map(([socketId, user]) => ({ 
        ...user, 
        socketId,
        isHost: socketId === room.host 
      }));
    
    // Get cyber scores for existing users
    Promise.all(existingUsers.map(async (user) => {
      const cyberScore = await getUserCyberScore(user.userId);
      return { ...user, cyberScore };
    })).then(usersWithCyberScores => {
      admittedSocket.emit("existing-users", usersWithCyberScores);
    });
  };

  socket.on("join-room", async ({ roomId, userId, userName }) => {
    socket.userId = userId;
    socket.userName = userName;
    socket.roomId = roomId;

    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        participants: new Map(),
        messages: [],
        recordings: [],
        host: null,
        waitingRoomEnabled: true
      });
    }
    
    const room = rooms.get(roomId);
    
    // Determine if user is the host (first to join)
    const isHost = room.participants.size === 0;
    if (isHost) {
      room.host = socket.id;
    }
    
    // Send host status to user
    socket.emit("host-status", { isHost });
    
    // If waiting room is enabled and user is not host, check admission eligibility
    if (room.waitingRoomEnabled && !isHost) {
      try {
        // Get user's cyber score for admission check
        const cyberScore = await getUserCyberScore(userId);
        
        // Check admission eligibility based on cyber score
        const admissionRules = {
          // Automatic rejection conditions
          autoReject: {
            conditions: [
              cyberScore.isRestricted,
              cyberScore.reputationLevel === 'banned',
              cyberScore.currentScore < 25
            ],
            reason: 'Account restricted due to behavior violations'
          },
          
          // Automatic approval conditions (high cyber score)
          autoApprove: {
            conditions: [
              cyberScore.currentScore >= 70,
              cyberScore.reputationLevel === 'excellent' || cyberScore.reputationLevel === 'good',
              !cyberScore.isRestricted
            ],
            reason: 'High cyber score - automatic approval'
          }
        };
        
        // Check for automatic rejection
        if (admissionRules.autoReject.conditions.some(condition => condition)) {
          socket.emit("admission-rejected", {
            reason: admissionRules.autoReject.reason,
            cyberScore: cyberScore.currentScore,
            reputationLevel: cyberScore.reputationLevel
          });
          
          logger.info(`User automatically rejected from meeting`, { 
            userName, 
            userId, 
            roomId, 
            reason: admissionRules.autoReject.reason,
            cyberScore: cyberScore.currentScore 
          });
          
          // Disconnect user after a brief delay
          setTimeout(() => {
            socket.disconnect(true);
          }, 3000);
          
          return;
        }
        
        // For now, disable automatic approval to ensure all users go through waiting room
        // This can be re-enabled later if needed
        // Check for automatic approval
        // if (admissionRules.autoApprove.conditions.every(condition => condition)) {
        //   logger.info(`User automatically approved for meeting`, { 
        //     userName, 
        //     userId, 
        //     roomId, 
        //     cyberScore: cyberScore.currentScore 
        //   });
        //   
        //   // Auto-admit user directly
        //   admitParticipantToMeeting(socket);
        //   return;
        // }
        
        // Default: requires host approval - add to waiting room
        // Initialize waiting room if needed
        if (!waitingRooms.has(roomId)) {
          waitingRooms.set(roomId, {
            participants: [],
            isEnabled: true
          });
        }
        
        const waitingRoom = waitingRooms.get(roomId);
        
        // Check if user is already in the actual meeting
        const alreadyInMeeting = room.participants.has(socket.id);
        if (alreadyInMeeting) {
          logger.info(`User already in meeting, bypassing waiting room`, { userName, userId, roomId });
          // User is already in the meeting, no need for waiting room
          return;
        }
        
        // Check if already in waiting room (by socketId or userId to handle reconnections)
        const existingWaitingBySocket = waitingRoom.participants.find(p => p.socketId === socket.id);
        const existingWaitingByUser = waitingRoom.participants.find(p => p.userId === userId);
        
        if (existingWaitingBySocket) {
          logger.info(`User already in waiting room by socket`, { userName, userId, socketId: socket.id });
          // Update the existing entry instead of creating a new one
          existingWaitingBySocket.joinedAt = new Date();
          existingWaitingBySocket.cyberScore = cyberScore;
        } else if (existingWaitingByUser) {
          logger.info(`User reconnecting to waiting room`, { userName, userId, oldSocketId: existingWaitingByUser.socketId, newSocketId: socket.id });
          // Update the existing entry with new socket ID (user reconnected)
          existingWaitingByUser.socketId = socket.id;
          existingWaitingByUser.joinedAt = new Date();
          existingWaitingByUser.cyberScore = cyberScore;
        } else {
          // Add new participant to waiting room
          waitingRoom.participants.push({
            socketId: socket.id,
            userId,
            userName,
            joinedAt: new Date(),
            cyberScore,
            admissionStatus: 'requires_approval'
          });
          logger.info(`New user added to waiting room`, { userName, userId, socketId: socket.id });
        }
        
        // Notify user they're in waiting room
        socket.emit("waiting-room-status", {
          inWaitingRoom: true,
          message: "Waiting for the host to admit you to the meeting...",
          cyberScore: cyberScore.currentScore,
          reputationLevel: cyberScore.reputationLevel
        });
        
        // Notify host of waiting participant with cyber score info
        if (room.host) {
          io.to(room.host).emit("waiting-participants-update", waitingRoom.participants);
        }
        
        logger.info(`User added to waiting room for host approval`, { 
          userName, 
          userId, 
          roomId, 
          socketId: socket.id,
          cyberScore: cyberScore.currentScore 
        });
        
      } catch (error) {
        console.error('Error checking admission eligibility:', error);
        
        // Fallback to normal waiting room behavior
        if (!waitingRooms.has(roomId)) {
          waitingRooms.set(roomId, {
            participants: [],
            isEnabled: true
          });
        }
        
        const waitingRoom = waitingRooms.get(roomId);
        
        waitingRoom.participants.push({
          socketId: socket.id,
          userId,
          userName,
          joinedAt: new Date(),
          cyberScore: { currentScore: 85, reputationLevel: 'good', isRestricted: false }
        });
        
        socket.emit("waiting-room-status", {
          inWaitingRoom: true,
          message: "Waiting for the host to admit you to the meeting..."
        });
        
        if (room.host) {
          io.to(room.host).emit("waiting-participants-update", waitingRoom.participants);
        }
      }
      return; // Don't proceed with normal room join
    }
    
    // If user is host or has been admitted, proceed with normal room join
    admitParticipantToMeeting(socket);

  });

  // WebRTC signaling
  socket.on("signal", (data) => {
    socket.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal,
      userId: socket.userId
    });
  });

  // Chat messages
  socket.on("chat-message", (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const messageData = {
      ...data,
      socketId: socket.id,
      timestamp: new Date()
    };
    room.messages.push(messageData);
    io.to(roomId).emit("chat-message", messageData);
  });

  // Screen sharing
  socket.on("start-screen-share", (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isScreenSharing = true;
    }
    
    // Broadcast to all other participants in the room
    socket.to(roomId).emit("user-screen-share", {
      userId: socket.userId,
      userName: socket.userName,
      socketId: socket.id,
      ...data
    });
    
    logger.info(`Screen sharing started`, { 
      userName: socket.userName, 
      userId: socket.userId, 
      roomId 
    });
  });

  socket.on("stop-screen-share", (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isScreenSharing = false;
    }
    
    // Broadcast to all other participants in the room
    socket.to(roomId).emit("user-stop-screen-share", {
      userId: socket.userId,
      userName: socket.userName,
      socketId: socket.id,
      ...data
    });
    
    logger.info(`Screen sharing stopped`, { 
      userName: socket.userName, 
      userId: socket.userId, 
      roomId 
    });
  });

  // Media control events
  socket.on("toggle-video", (isVideoOn) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isVideoOn = isVideoOn;
      socket.to(roomId).emit("user-toggle-video", {
        userId: socket.userId,
        isVideoOn,
        socketId: socket.id
      });
    }
  });

  socket.on("toggle-audio", (isAudioOn) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isAudioOn = isAudioOn;
      socket.to(roomId).emit("user-toggle-audio", {
        userId: socket.userId,
        isAudioOn,
        socketId: socket.id
      });
    }
  });

  // Waiting room admission handlers
  socket.on("admit-participant", ({ participantId, roomId }) => {
    console.log('ADMIT: Received admit-participant event:', { participantId, roomId, hostId: socket.id });
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      console.log('ADMIT: Permission denied or room not found:', { roomExists: !!room, isHost: room?.host === socket.id });
      socket.emit("error", { message: "Only the host can admit participants" });
      return;
    }
    
    const waitingRoom = waitingRooms.get(roomId);
    if (!waitingRoom) {
      console.log('ADMIT: No waiting room found for roomId:', roomId);
      return;
    }
    
    console.log('ADMIT: Waiting room found with participants:', waitingRoom.participants.length);
    
    // Find and remove participant from waiting room
    const participantIndex = waitingRoom.participants.findIndex(p => p.socketId === participantId);
    if (participantIndex === -1) {
      console.log('ADMIT: Participant not found in waiting room:', { participantId, waitingParticipants: waitingRoom.participants.map(p => p.socketId) });
      return;
    }
    
    const participant = waitingRoom.participants[participantIndex];
    console.log('ADMIT: Found participant to admit:', participant.userName);
    waitingRoom.participants.splice(participantIndex, 1);
    
    // Find the socket for the participant to admit
    const participantSocket = io.sockets.sockets.get(participantId);
    if (participantSocket) {
      console.log('ADMIT: Found socket for participant, admitting to meeting...');
      // Admit the participant to the actual meeting
      admitParticipantToMeeting(participantSocket);
      
      // Notify the participant they've been admitted
      participantSocket.emit("admitted-to-meeting");
    } else {
      console.log('ADMIT: Socket not found for participant:', participantId);
    }
    
    // Update waiting room list for host
    console.log('ADMIT: Sending updated waiting room list to host, remaining participants:', waitingRoom.participants.length);
    socket.emit("waiting-participants-update", waitingRoom.participants);
    
    logger.info(`Participant admitted to meeting`, { 
      participantName: participant.userName, 
      roomId, 
      hostId: socket.id 
    });
  });
    
  socket.on("reject-participant", ({ participantId, roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can reject participants" });
      return;
    }
    
    const waitingRoom = waitingRooms.get(roomId);
    if (!waitingRoom) return;
    
    // Find and remove participant from waiting room
    const participantIndex = waitingRoom.participants.findIndex(p => p.socketId === participantId);
    if (participantIndex === -1) return;
    
    const participant = waitingRoom.participants[participantIndex];
    waitingRoom.participants.splice(participantIndex, 1);
    
    // Reject the participant
    io.to(participantId).emit("rejected-from-meeting", {
      message: "The host has denied your request to join the meeting."
    });
    
    // Update waiting room list for host
    socket.emit("waiting-participants-update", waitingRoom.participants);
    
    logger.info(`Participant rejected from meeting`, { 
      participantName: participant.userName, 
      roomId, 
      hostId: socket.id 
    });
  });
    
  socket.on("admit-all-participants", ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can admit participants" });
      return;
    }
    
    const waitingRoom = waitingRooms.get(roomId);
    if (!waitingRoom || waitingRoom.participants.length === 0) return;
    
    // Admit all waiting participants
    const participantsToAdmit = [...waitingRoom.participants];
    waitingRoom.participants = [];
    
    participantsToAdmit.forEach(participant => {
      const participantSocket = io.sockets.sockets.get(participant.socketId);
      if (participantSocket) {
        // Admit the participant to the actual meeting
        admitParticipantToMeeting(participantSocket);
        
        // Notify the participant they've been admitted
        participantSocket.emit("admitted-to-meeting");
      }
    });
    
    // Update waiting room list for host
    socket.emit("waiting-participants-update", waitingRoom.participants);
    
    logger.info(`All participants admitted to meeting`, { 
      count: participantsToAdmit.length,
      roomId, 
      hostId: socket.id 
    });
  });

  // Host control events
  socket.on("host-mute-participant", ({ participantId, roomId, hostName }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can mute participants" });
      return;
    }
    
    // Notify the specific participant to mute themselves
    io.to(participantId).emit("host-muted-you", {
      hostName,
      hostId: socket.id
    });
    
    // Update participant status in room
    const participant = room.participants.get(participantId);
    if (participant) {
      participant.isAudioOn = false;
    }
    
    // Broadcast status update to all participants
    io.to(roomId).emit("participant-status-update", {
      participantId,
      isAudioOn: false,
      isVideoOn: participant?.isVideoOn || false
    });
    
    logger.info(`Host muted participant`, { hostName, participantId, roomId });
  });

  socket.on("host-disable-video", ({ participantId, roomId, hostName }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can disable participant videos" });
      return;
    }
    
    // Notify the specific participant to disable their video
    io.to(participantId).emit("host-disabled-your-video", {
      hostName,
      hostId: socket.id
    });
    
    // Update participant status in room
    const participant = room.participants.get(participantId);
    if (participant) {
      participant.isVideoOn = false;
    }
    
    // Broadcast status update to all participants
    io.to(roomId).emit("participant-status-update", {
      participantId,
      isAudioOn: participant?.isAudioOn || false,
      isVideoOn: false
    });
    
    logger.info(`Host disabled participant video`, { hostName, participantId, roomId });
  });

  socket.on("host-remove-participant", async ({ participantId, roomId, hostName, reason }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can remove participants" });
      return;
    }
    
    const participant = room.participants.get(participantId);
    if (participant) {
      // Track removal in cyber score analytics (same as kick)
      const kickStats = await MeetingAnalyticsService.trackMeetingKick(
        participant.userId, 
        roomId, 
        reason || 'Removed by host'
      );
      
      // Notify the participant they're being removed
      io.to(participantId).emit("host-removed-you", {
        hostName,
        hostId: socket.id,
        reason: reason || "Removed by host"
      });
      
      // Remove participant from room
      room.participants.delete(participantId);
      
      // Emit real-time cyber score update
      if (kickStats && io) {
        io.to(`cyber-score-${participant.userId}`).emit('cyber-score-updated', {
          userId: participant.userId,
          previousScore: kickStats.newScore + 10,
          newScore: kickStats.newScore,
          pointsChanged: -10,
          reason: `Removed from meeting: ${reason || 'Host decision'}`,
          reputationLevel: kickStats.reputationLevel,
          timestamp: new Date()
        });
        
        io.to(`cyber-score-${participant.userId}`).emit('meeting-stats-updated', {
          userId: participant.userId,
          meetingStats: await MeetingAnalyticsService.getMeetingStats(participant.userId),
          timestamp: new Date()
        });
      }
      
      // Disconnect the participant after a short delay
      setTimeout(() => {
        const participantSocket = io.sockets.sockets.get(participantId);
        if (participantSocket) {
          participantSocket.disconnect(true);
        }
      }, 6000); // 6 seconds to show the message
      
      // Notify other participants that someone was removed
      socket.to(roomId).emit("user-disconnected", {
        socketId: participantId,
        reason: "removed_by_host"
      });
      
      logger.info(`Host removed participant`, { 
        hostName: socket.userName,
        participantName: participant.userName,
        participantId: participant.userId,
        roomId, 
        reason: reason || 'Removed by host'
      });
    }
  });

  socket.on("host-mute-all", ({ roomId, hostName }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can mute all participants" });
      return;
    }
    
    // Mute all participants except the host
    room.participants.forEach((participant, socketId) => {
      if (socketId !== socket.id) {
        participant.isAudioOn = false;
        io.to(socketId).emit("host-muted-all", {
          hostName,
          hostId: socket.id
        });
      }
    });
    
    // Broadcast the bulk mute status to all participants
    io.to(roomId).emit("all-participants-muted", {
      hostName,
      hostId: socket.id
    });
    
    logger.info(`Host muted all participants`, { hostName, roomId, count: room.participants.size - 1 });
  });

  socket.on("host-disable-all-videos", ({ roomId, hostName }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can disable all videos" });
      return;
    }
    
    // Disable all participant videos except the host
    room.participants.forEach((participant, socketId) => {
      if (socketId !== socket.id) {
        participant.isVideoOn = false;
        io.to(socketId).emit("host-disabled-all-videos", {
          hostName,
          hostId: socket.id
        });
      }
    });
    
    // Broadcast the bulk video disable status to all participants
    io.to(roomId).emit("all-participant-videos-disabled", {
      hostName,
      hostId: socket.id
    });
    
    logger.info(`Host disabled all participant videos`, { hostName, roomId, count: room.participants.size - 1 });
  });

  // Typing indicators
  socket.on("typing-start", () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    socket.to(roomId).emit("user-typing", {
      userId: socket.userId,
      userName: socket.userName
    });
  });

  socket.on("typing-stop", () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    socket.to(roomId).emit("user-stop-typing", {
      userId: socket.userId
    });
  });

  // Emoji reactions
  socket.on("emoji-reaction", (data) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    // Broadcast emoji to all other participants in the room
    socket.to(roomId).emit("emoji-reaction", {
      ...data,
      socketId: socket.id,
      timestamp: new Date()
    });
    
    logger.info(`Emoji reaction sent`, { 
      userName: socket.userName, 
      emoji: data.emojiData?.emoji, 
      roomId 
    });
  });

  // Hand raise toggle
  socket.on("hand-raise-toggle", (isHandRaised) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    
    const room = rooms.get(roomId);
    if (!room) return;
    
    const participant = room.participants.get(socket.id);
    if (participant) {
      participant.isHandRaised = isHandRaised;
      
      // Broadcast hand raise status to all participants
      socket.to(roomId).emit("user-hand-raise", {
        userId: socket.userId,
        userName: socket.userName,
        isHandRaised,
        socketId: socket.id
      });
      
      logger.info(`Hand raise toggled`, { 
        userName: socket.userName, 
        isHandRaised, 
        roomId 
      });
    }
  });

  // Handle disconnect
  // Kick participant from meeting
  socket.on("kick-participant", async ({ roomId, participantSocketId, reason }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can kick participants" });
      return;
    }
    
    const participant = room.participants.get(participantSocketId);
    if (participant) {
      // Track kick in cyber score analytics
      const kickStats = await MeetingAnalyticsService.trackMeetingKick(
        participant.userId, 
        roomId, 
        reason || 'Host decision'
      );
      
      // Notify the participant they're being kicked
      io.to(participantSocketId).emit("kicked-from-meeting", {
        reason: reason || 'Host decision',
        hostName: socket.userName
      });
      
      // Remove participant from room
      room.participants.delete(participantSocketId);
      
      // Notify other participants
      socket.to(roomId).emit("participant-kicked", {
        participantId: participant.userId,
        participantName: participant.userName,
        reason: reason || 'Host decision'
      });
      
      // Emit real-time cyber score update
      if (kickStats && io) {
        io.to(`cyber-score-${participant.userId}`).emit('cyber-score-updated', {
          userId: participant.userId,
          previousScore: kickStats.newScore + 10, // Add back the points that were deducted
          newScore: kickStats.newScore,
          pointsChanged: -10,
          reason: `Kicked from meeting: ${reason || 'Host decision'}`,
          reputationLevel: kickStats.reputationLevel,
          timestamp: new Date()
        });
        
        io.to(`cyber-score-${participant.userId}`).emit('meeting-stats-updated', {
          userId: participant.userId,
          meetingStats: await MeetingAnalyticsService.getMeetingStats(participant.userId),
          timestamp: new Date()
        });
      }
      
      // Disconnect the participant
      const participantSocket = io.sockets.sockets.get(participantSocketId);
      if (participantSocket) {
        participantSocket.disconnect(true);
      }
      
      logger.info(`Participant kicked from meeting`, {
        hostName: socket.userName,
        participantName: participant.userName,
        participantId: participant.userId,
        roomId,
        reason: reason || 'Host decision'
      });
    }
  });
  
  // Ban participant from meetings
  socket.on("ban-participant", async ({ roomId, participantSocketId, reason, duration }) => {
    const room = rooms.get(roomId);
    if (!room || room.host !== socket.id) {
      socket.emit("error", { message: "Only the host can ban participants" });
      return;
    }
    
    const participant = room.participants.get(participantSocketId);
    if (participant) {
      // Calculate ban expiry if duration is provided (in hours)
      let bannedUntil = null;
      if (duration) {
        bannedUntil = new Date();
        bannedUntil.setHours(bannedUntil.getHours() + duration);
      }
      
      // Track ban in cyber score analytics
      const banStats = await MeetingAnalyticsService.trackMeetingBan(
        participant.userId, 
        roomId, 
        reason || 'Severe violation', 
        bannedUntil
      );
      
      // Notify the participant they're being banned
      io.to(participantSocketId).emit("banned-from-meetings", {
        reason: reason || 'Severe violation',
        duration,
        bannedUntil,
        hostName: socket.userName
      });
      
      // Remove participant from room
      room.participants.delete(participantSocketId);
      
      // Notify other participants
      socket.to(roomId).emit("participant-banned", {
        participantId: participant.userId,
        participantName: participant.userName,
        reason: reason || 'Severe violation'
      });
      
      // Emit real-time cyber score update
      if (banStats && io) {
        io.to(`cyber-score-${participant.userId}`).emit('cyber-score-updated', {
          userId: participant.userId,
          previousScore: banStats.newScore + 25, // Add back the points that were deducted
          newScore: banStats.newScore,
          pointsChanged: -25,
          reason: `Banned from meetings: ${reason || 'Severe violation'}`,
          reputationLevel: banStats.reputationLevel,
          timestamp: new Date()
        });
        
        io.to(`cyber-score-${participant.userId}`).emit('meeting-stats-updated', {
          userId: participant.userId,
          meetingStats: await MeetingAnalyticsService.getMeetingStats(participant.userId),
          timestamp: new Date()
        });
      }
      
      // Disconnect the participant
      const participantSocket = io.sockets.sockets.get(participantSocketId);
      if (participantSocket) {
        participantSocket.disconnect(true);
      }
      
      logger.info(`Participant banned from meetings`, {
        hostName: socket.userName,
        participantName: participant.userName,
        participantId: participant.userId,
        roomId,
        reason: reason || 'Severe violation',
        duration,
        bannedUntil
      });
    }
  });

  // Cyber Score real-time updates
  socket.on("join-cyber-score-updates", ({ userId }) => {
    if (userId) {
      const roomName = `cyber-score-${userId}`;
      socket.join(roomName);
      console.log(`User ${userId} joined cyber score updates room: ${roomName}`);
      logger.info(`User joined cyber score updates`, { userId, socketId: socket.id, roomName });
    }
  });
  
  socket.on("disconnect", async (reason) => {
      logger.info(`User disconnected`, { 
        userName: socket.userName, 
        userId: socket.userId, 
        roomId: socket.roomId, 
        reason,
        socketId: socket.id 
      });
      console.log(`${socket.userName} (${socket.userId}) disconnected from room ${socket.roomId} - Reason: ${reason}`);
      
      // Track meeting leave for cyber score analytics
      if (socket.userId && socket.roomId) {
        const isCompleted = reason !== 'client namespace disconnect' && reason !== 'transport close';
        const meetingStats = await MeetingAnalyticsService.trackMeetingLeave(socket.userId, socket.roomId, isCompleted);
        
        // Emit meeting stats update if we got updated stats
        if (meetingStats && io) {
          io.to(`cyber-score-${socket.userId}`).emit('meeting-stats-updated', {
            userId: socket.userId,
            meetingStats: await MeetingAnalyticsService.getMeetingStats(socket.userId),
            timestamp: new Date()
          });
        }
      }
      
      if (socket.roomId && rooms.has(socket.roomId)) {
        const room = rooms.get(socket.roomId);
        room.participants.delete(socket.id);
        
        // If disconnecting user was the host, assign new host
        if (room.host === socket.id && room.participants.size > 0) {
          const newHostId = room.participants.keys().next().value;
          room.host = newHostId;
          io.to(newHostId).emit("host-status", { isHost: true });
          logger.info(`New host assigned`, { newHostId, roomId: socket.roomId });
        }
        
        // Clean up empty rooms
        if (room.participants.size === 0) {
          rooms.delete(socket.roomId);
          // Also clean up waiting room
          if (waitingRooms.has(socket.roomId)) {
            waitingRooms.delete(socket.roomId);
          }
        }
      }
      
      // Remove from waiting room if present
      if (socket.roomId && waitingRooms.has(socket.roomId)) {
        const waitingRoom = waitingRooms.get(socket.roomId);
        const participantIndex = waitingRoom.participants.findIndex(p => p.socketId === socket.id);
        if (participantIndex !== -1) {
          waitingRoom.participants.splice(participantIndex, 1);
          
          // Notify host of updated waiting room
          const room = rooms.get(socket.roomId);
          if (room && room.host) {
            io.to(room.host).emit("waiting-participants-update", waitingRoom.participants);
          }
        }
      }
      
      if (socket.roomId) {
        socket.to(socket.roomId).emit("user-disconnected", {
          userId: socket.userId,
          socketId: socket.id
        });
      }
    });
});

    


// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Listen on a single port for both Express and Socket.IO
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  
  // Start notification scheduler
  notificationScheduler.start(60000); // Check every minute
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  notificationScheduler.stop();
  httpServer.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  notificationScheduler.stop();
  httpServer.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});
