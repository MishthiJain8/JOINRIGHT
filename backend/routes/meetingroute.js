import express from "express";
import {
  createMeeting,
  joinMeeting,
  getUserMeetings,
  saveRecording,
  getRecordings,
  saveChatMessage,
  getChatHistory,
  updateMeetingStatus,
  getMeetingById,
  endMeeting,
  getUpcomingMeetings,
  getMeetingStats,
  updateMeeting,
  deleteMeeting
} from "../controllers/meetingcontroller.js";

const router = express.Router();

// Meeting CRUD operations
router.post("/create", createMeeting);
router.post("/join", joinMeeting);
router.get("/user/:email", getUserMeetings);
router.get("/user/:email/upcoming", getUpcomingMeetings);
router.get("/user/:email/stats", getMeetingStats);
router.get("/meeting/:meetingId", getMeetingById);
router.put("/meeting/:meetingId", updateMeeting);
router.delete("/meeting/:meetingId", deleteMeeting);
router.put("/meeting/:meetingId/status", updateMeetingStatus);
router.post("/meeting/:meetingId/end", endMeeting);

// Chat functionality
router.post("/:roomId/chat", saveChatMessage);
router.get("/:roomId/chat", getChatHistory);

// Recording functionality
router.post("/save-recording", saveRecording);
router.get("/:link/recordings", getRecordings);

export default router;
