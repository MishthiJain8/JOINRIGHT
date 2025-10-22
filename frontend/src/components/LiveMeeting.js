import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import Peer from 'simple-peer';
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaComment,
  FaUsers,
  FaRecordVinyl,
  FaStop,
  FaPaperPlane,
  FaSmile,
  FaHandPaper,
  FaChevronUp,
  FaEllipsisH,
  FaShieldAlt,
  FaUserFriends,
  FaTimes,
  FaThumbsUp,
  FaHeart,
  FaLaugh,
  FaSadTear,
  FaTh,
  FaCog,
  FaPhone,
  FaCrown,
  FaLock,
  FaUserClock,
  FaCheck,
  FaBan,
  FaUserCheck,
  FaHourglassHalf,
  FaSignInAlt,
  FaUserPlus,
  FaClosedCaptioning,
  FaFile,
  FaClipboard,
  FaShareAlt,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeDown,
  FaVolumeOff,
  FaPlay,
  FaUser
} from 'react-icons/fa';
import './LiveMeeting.css';
import { useUI } from '../contexts/UIContext';

const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const LiveMeeting = ({ 
  roomId: propRoomId, 
  userName: propUserName, 
  onClose 
}) => {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { enterImmersiveMode, exitImmersiveMode } = useUI();

  // Use props if provided (for overlay mode), otherwise use route params
  const roomId = propRoomId || paramRoomId;
  const userName = propUserName || location.state?.userName || "Guest";

  // Refs
  const socketRef = useRef();
  const userVideo = useRef();
  const cameraVideo = useRef();
  const screenShareVideo = useRef();
  const peersRef = useRef([]);
  const chatContainerRef = useRef();
  const mediaRecorderRef = useRef(null);

  // Main State
  const [peers, setPeers] = useState([]);
  const [userStream, setUserStream] = useState();
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [supportsScreenShare, setSupportsScreenShare] = useState(false);

  // UI State
  const [viewMode, setViewMode] = useState('speaker'); // 'speaker' or 'gallery'
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);

  // Meeting State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [reactions, setReactions] = useState([]);
  const [activeEmojis, setActiveEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  
  // Additional UI State
  const [showCaptions, setShowCaptions] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSecurityOptions, setShowSecurityOptions] = useState(false);
  
  // Picture-in-Picture and Dual Video State
  const [cameraMinimized, setCameraMinimized] = useState(false);
  const [screenShareMinimized, setScreenShareMinimized] = useState(false);
  const [cameraPosition, setCameraPosition] = useState({ x: 20, y: 20 });
  const [screenSharePosition, setScreenSharePosition] = useState({ x: 20, y: 20 });
  const [cameraSize, setCameraSize] = useState({ width: 200, height: 150 });
  const [screenShareSize, setScreenShareSize] = useState({ width: 300, height: 225 });
  const [cameraMuted, setCameraMuted] = useState(false);
  const [screenShareMuted, setScreenShareMuted] = useState(false);
  const [mainVideoStream, setMainVideoStream] = useState('camera'); // 'camera' or 'screen'

  // Meeting Info
  const [isHost, setIsHost] = useState(false);
  const [meetingLocked, setMeetingLocked] = useState(false);
  
  // Meeting States
  const [meetingState, setMeetingState] = useState('waiting'); // 'waiting', 'active', 'ended'
  const [meetingStarted, setMeetingStarted] = useState(false);
  const [participantsWaitingToJoin, setParticipantsWaitingToJoin] = useState([]);
  const [canJoinMeeting, setCanJoinMeeting] = useState(false);
  
  // Waiting Room State
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState([]);
  const [showWaitingRoom, setShowWaitingRoom] = useState(false);
  const [waitingMessage, setWaitingMessage] = useState('Waiting for host to admit you...');
  const [isAdmitted, setIsAdmitted] = useState(false);

  // Enter immersive mode on mount
  useEffect(() => {
    enterImmersiveMode();
    return () => exitImmersiveMode();
  }, [enterImmersiveMode, exitImmersiveMode]);

  // Initialize socket connection and media
  useEffect(() => {
    initializeConnection();
    return cleanup;
  }, [roomId, userName]);

  const initializeConnection = async () => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      setUserStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      // Check screen sharing support
      const isScreenShareSupported = navigator.mediaDevices && 
                                   navigator.mediaDevices.getDisplayMedia && 
                                   (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
      setSupportsScreenShare(isScreenShareSupported);
      
      if (!isScreenShareSupported) {
        console.warn('Screen sharing not supported:', {
          hasGetDisplayMedia: !!navigator.mediaDevices?.getDisplayMedia,
          isHTTPS: window.location.protocol === 'https:',
          isLocalhost: window.location.hostname === 'localhost'
        });
      }

      // Initialize socket
      socketRef.current = io(SOCKET_SERVER_URL);
      setupSocketHandlers(stream);

    } catch (error) {
      console.error("Error accessing media:", error);
      alert("Please allow camera and microphone access to join the meeting.");
    }
  };

  const setupSocketHandlers = (stream) => {
    const socket = socketRef.current;

    socket.emit("join-room", { roomId, userId: userName, userName });
    
    // Check if user is the first to join (becomes host)
    socket.on("host-status", (data) => {
      setIsHost(data.isHost);
      setMeetingStarted(data.meetingStarted || false);
      
      if (data.isHost) {
        setIsAdmitted(true);
        setCanJoinMeeting(true);
        console.log('You are the host of this meeting');
        
        // Host can decide meeting state
        if (data.meetingStarted) {
          setMeetingState('active');
        } else {
          setMeetingState('waiting');
        }
      } else {
        // Non-host participants wait for meeting to start
        if (data.meetingStarted) {
          setCanJoinMeeting(true);
          setMeetingState('active');
          setIsAdmitted(true);
        } else {
          setCanJoinMeeting(false);
          setMeetingState('waiting');
          setIsInWaitingRoom(true);
          setWaitingMessage('Waiting for the host to start the meeting...');
        }
      }
    });
    
    // Handle waiting room status
    socket.on("waiting-room-status", (data) => {
      if (data.inWaitingRoom) {
        setIsInWaitingRoom(true);
        setWaitingMessage(data.message || 'Waiting for host to admit you...');
      } else {
        setIsInWaitingRoom(false);
        setIsAdmitted(true);
      }
    });
    
    // Handle waiting participants updates (for host)
    socket.on("waiting-participants-update", (participants) => {
      setWaitingParticipants(participants);
    });
    
    // Handle admission to meeting
    socket.on("admitted-to-meeting", () => {
      setIsInWaitingRoom(false);
      setIsAdmitted(true);
      setWaitingMessage('');
    });
    
    // Handle rejection from meeting
    socket.on("rejected-from-meeting", (data) => {
      setWaitingMessage(data.message || 'The host has denied your request to join.');
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 3000);
    });
    
    // Handle meeting start by host
    socket.on("meeting-started", (data) => {
      console.log('Meeting started by host');
      setMeetingStarted(true);
      setMeetingState('active');
      setCanJoinMeeting(true);
      setIsInWaitingRoom(false);
      setIsAdmitted(true);
      setWaitingMessage('');
    });
    
    // Handle meeting end by host
    socket.on("meeting-ended", (data) => {
      console.log('Meeting ended by host');
      setMeetingState('ended');
      setWaitingMessage(data.message || 'The meeting has been ended by the host.');
      setTimeout(() => {
        cleanup();
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 3000);
    });
    
    // Handle waiting participants list (for host)
    socket.on("waiting-participants-list", (participants) => {
      setParticipantsWaitingToJoin(participants);
    });

    // Only set up peer connections if meeting is active and user is admitted
    socket.on("existing-users", (users) => {
      // Only connect if meeting has started and user is admitted
      if (!meetingStarted && !isHost) {
        console.log('Meeting not started yet, not connecting to peers');
        return;
      }
      
      const newPeers = users.map(user => {
        // Use screen stream if currently sharing, otherwise use user stream
        const currentStream = isScreenSharing && screenStream ? screenStream : stream;
        const peer = createPeer(user.socketId, socket.id, currentStream);
        peersRef.current.push({ peerID: user.socketId, peer, userName: user.userName });
        return { peer, userName: user.userName, socketId: user.socketId };
      });
      setPeers(newPeers);
      setParticipantsList(users);
    });

    socket.on("user-connected", (userInfo) => {
      // Use screen stream if currently sharing, otherwise use user stream
      const currentStream = isScreenSharing && screenStream ? screenStream : stream;
      const peer = addPeer(null, userInfo.socketId, currentStream);
      peersRef.current.push({ peerID: userInfo.socketId, peer, userName: userInfo.userName });
      setPeers(prev => [...prev, { peer, userName: userInfo.userName, socketId: userInfo.socketId }]);
      setParticipantsList(prev => [...prev, userInfo]);
    });

    socket.on("signal", ({ from, signal }) => {
      const item = peersRef.current.find(p => p.peerID === from);
      if (item?.peer) {
        item.peer.signal(signal);
      }
    });

    socket.on("user-disconnected", ({ socketId }) => {
      const peerObj = peersRef.current.find(p => p.peerID === socketId);
      if (peerObj?.peer) {
        peerObj.peer.destroy();
      }
      peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
      setParticipantsList(prev => prev.filter(p => p.socketId !== socketId));
    });

    socket.on("chat-message", (data) => {
      setChatMessages(prev => [...prev, data]);
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });

    socket.on("user-typing", ({ userId, userName: typingUserName }) => {
      setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, userName: typingUserName }]);
    });

    socket.on("user-stop-typing", ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    socket.on("reaction", (reaction) => {
      setReactions(prev => [...prev, reaction]);
      setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== reaction.id));
      }, 3000);
    });
    
    // Handle emoji reactions from other participants
    socket.on("emoji-reaction", (data) => {
      console.log('Received emoji from another user:', data);
      
      const { emojiData } = data;
      
      // Don't display our own emojis again (already shown locally)
      if (emojiData.userId === socket.id) {
        return;
      }
      
      // Add position if not present (for incoming emojis from other users)
      if (!emojiData.position) {
        emojiData.position = {
          left: `${15 + Math.random() * 70}%`,
          animationDelay: `${Math.random() * 0.5}s`
        };
      }
      
      // Add received emoji to local state
      setActiveEmojis(prev => [...prev, emojiData]);
      
      // Remove emoji after animation completes
      setTimeout(() => {
        setActiveEmojis(prev => prev.filter(e => e.id !== emojiData.id));
      }, 3500);
    });
    
    // Legacy emoji handler (keep for backward compatibility)
    socket.on("emoji", (emojiData) => {
      console.log('Received legacy emoji:', emojiData);
      
      // Don't display our own emojis again
      if (emojiData.userId === socket.id) {
        return;
      }
      
      // Add position if not present
      if (!emojiData.position) {
        emojiData.position = {
          left: `${15 + Math.random() * 70}%`,
          animationDelay: `${Math.random() * 0.5}s`
        };
      }
      
      setActiveEmojis(prev => [...prev, emojiData]);
      setTimeout(() => {
        setActiveEmojis(prev => prev.filter(e => e.id !== emojiData.id));
      }, 3500);
    });
  };

  const createPeer = useCallback((userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current?.emit("signal", { to: userToSignal, from: callerID, signal });
    });

    peer.on("error", console.warn);
    return peer;
  }, []);

  const addPeer = useCallback((incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current?.emit("signal", { to: callerID, from: socketRef.current.id, signal });
    });

    if (incomingSignal) peer.signal(incomingSignal);
    peer.on("error", console.warn);
    return peer;
  }, []);

  // Media Controls
  const toggleAudio = () => {
    if (userStream) {
      const audioTrack = userStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
        socketRef.current?.emit("toggle-audio", !isAudioOn);
      }
    }
  };

  const toggleVideo = () => {
    if (userStream) {
      const videoTrack = userStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
        socketRef.current?.emit("toggle-video", !isVideoOn);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      // Check if browser supports screen sharing
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        alert('Screen sharing is not supported in this browser. Please use Chrome, Firefox, or Safari.');
        return;
      }

      // Check if running over HTTPS (required for screen sharing)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        alert('Screen sharing requires HTTPS. Please access the site over HTTPS.');
        return;
      }

      // Request screen share with better error handling
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      setScreenStream(stream);
      setIsScreenSharing(true);

      // Set up dual video display
      // Main video shows screen share by default
      setMainVideoStream('screen');
      
      // Display screen share in main video and dedicated screen share element
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
        console.log('Main video element updated to show screen share');
      }
      
      if (screenShareVideo.current) {
        screenShareVideo.current.srcObject = stream;
        console.log('Screen share video element updated');
      }
      
      // Keep camera feed in its own element (Picture-in-Picture)
      if (cameraVideo.current && userStream) {
        cameraVideo.current.srcObject = userStream;
        console.log('Camera video element maintained for PiP');
      }

      // Replace video track in all peer connections with improved error handling
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            try {
              // For Simple Peer, replace the track directly
              if (peer.replaceTrack && userStream?.getVideoTracks()[0]) {
                peer.replaceTrack(userStream.getVideoTracks()[0], videoTrack, stream)
                  .then(() => {
                    console.log('Successfully replaced video track for screen share');
                  })
                  .catch(error => {
                    console.warn('Failed to replace track for screen share:', error);
                    // Fallback: try alternative method
                    try {
                      peer.removeTrack(userStream.getVideoTracks()[0], userStream);
                      peer.addTrack(videoTrack, stream);
                    } catch (fallbackError) {
                      console.warn('Fallback track replacement also failed:', fallbackError);
                    }
                  });
              } else if (peer.getSenders) {
                // For newer WebRTC implementations
                const sender = peer.getSenders().find(s => 
                  s.track && s.track.kind === 'video'
                );
                
                if (sender && sender.replaceTrack) {
                  sender.replaceTrack(videoTrack).catch(error => {
                    console.warn('Failed to replace video track for screen share:', error);
                  });
                }
              }
            } catch (error) {
              console.warn('Error replacing track for screen share:', error);
            }
          }
        });
      }

      // Emit screen share start event
      socketRef.current?.emit("start-screen-share", { userId: socketRef.current.id, userName });

      // Handle screen share end (when user clicks "Stop Sharing" in browser)
      stream.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing ended by user');
        stopScreenShare();
      };

      console.log('Screen sharing started successfully');
    } catch (error) {
      console.error("Error starting screen share:", error);
      setIsScreenSharing(false);
      
      // Provide user-friendly error messages
      if (error.name === 'NotAllowedError') {
        alert('Screen sharing was denied. Please allow screen sharing and try again.');
      } else if (error.name === 'NotSupportedError') {
        alert('Screen sharing is not supported in this browser.');
      } else if (error.name === 'NotFoundError') {
        alert('No screen sources available for sharing.');
      } else {
        alert('Failed to start screen sharing. Please try again.');
      }
    }
  };

  const stopScreenShare = () => {
    console.log('Stopping screen share...');
    
    // Stop all screen sharing tracks
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping screen share track:', error);
        }
      });
      setScreenStream(null);
    }

    setIsScreenSharing(false);
    
    // Reset to camera as main video
    setMainVideoStream('camera');

    // Restore camera video to main video element
    if (userStream && userVideo.current) {
      userVideo.current.srcObject = userStream;
      console.log('Main video element restored to camera');
    }
    
    // Clear screen share video element
    if (screenShareVideo.current) {
      screenShareVideo.current.srcObject = null;
      console.log('Screen share video element cleared');
    }

    // Replace screen share track back to camera video for peers
    if (userStream) {
      const cameraVideoTrack = userStream.getVideoTracks()[0];
      if (cameraVideoTrack) {
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            try {
              // For Simple Peer, replace the track directly
              if (peer.replaceTrack && screenStream?.getVideoTracks()[0]) {
                peer.replaceTrack(screenStream.getVideoTracks()[0], cameraVideoTrack, userStream)
                  .then(() => {
                    console.log('Successfully restored camera track for peer');
                  })
                  .catch(error => {
                    console.warn('Failed to restore camera track:', error);
                    // Fallback: try alternative method
                    try {
                      peer.removeTrack(screenStream.getVideoTracks()[0], screenStream);
                      peer.addTrack(cameraVideoTrack, userStream);
                    } catch (fallbackError) {
                      console.warn('Fallback track restoration also failed:', fallbackError);
                    }
                  });
              } else if (peer.getSenders) {
                // For newer WebRTC implementations
                const sender = peer.getSenders().find(s => 
                  s.track && s.track.kind === 'video'
                );
                
                if (sender && sender.replaceTrack) {
                  sender.replaceTrack(cameraVideoTrack).catch(error => {
                    console.warn('Failed to replace screen share with camera:', error);
                  });
                }
              }
            } catch (error) {
              console.warn('Error replacing track back to camera:', error);
            }
          }
        });
      }
    }

    // Emit screen share stop event
    socketRef.current?.emit("stop-screen-share", { userId: socketRef.current.id, userName });
    console.log('Screen sharing stopped successfully');
  };

  const startRecording = () => {
    if (userStream) {
      try {
        const mediaRecorder = new MediaRecorder(userStream);
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setRecordedChunks(prev => [...prev, event.data]);
          }
        };
        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (error) {
        console.error('Recording error:', error);
        alert('Recording not supported');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meeting-${roomId}-${Date.now()}.webm`;
        a.click();
        setRecordedChunks([]);
      };
      setIsRecording(false);
    }
  };

  // Chat Functions
  const sendMessage = () => {
    if (message.trim() && socketRef.current) {
      const messageData = {
        sender: userName,
        message: message.trim(),
        type: 'text',
        time: new Date().toISOString()
      };
      socketRef.current.emit("chat-message", messageData);
      setMessage("");
      socketRef.current.emit("typing-stop");
    }
  };

  const handleTyping = () => {
    socketRef.current?.emit("typing-start");
    setTimeout(() => socketRef.current?.emit("typing-stop"), 2000);
  };

  // Reactions
  const sendReaction = (reactionType) => {
    const reaction = {
      id: Date.now(),
      type: reactionType,
      user: userName,
      timestamp: Date.now()
    };
    
    socketRef.current?.emit('reaction', reaction);
    setReactions(prev => [...prev, reaction]);
    setShowReactions(false);
    
    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
  };
  
  // Enhanced Emoji System
  const sendEmoji = (emoji) => {
    setShowEmojiPicker(false);
    setShowReactions(false);
    
    const emojiData = { 
      emoji, 
      userId: socketRef.current?.id || `user_${Date.now()}`,
      userName: userName,
      id: `emoji_${Date.now()}_${Math.random()}`, // More unique ID
      timestamp: Date.now(),
      position: {
        left: `${15 + Math.random() * 70}%`, // Random position from 15% to 85%
        animationDelay: `${Math.random() * 0.5}s` // Random delay up to 0.5s
      }
    };
    
    console.log('Sending emoji:', emojiData); // Debug log
    
    // Add to local state immediately
    setActiveEmojis(prev => [...prev, emojiData]);
    
    // Broadcast to other participants via socket
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('emoji-reaction', {
        roomId: roomId,
        emojiData: emojiData
      });
      console.log('Emoji broadcasted to room:', roomId);
    } else {
      console.warn('Socket not connected, emoji not sent to other participants');
    }
    
    // Remove emoji after animation completes
    setTimeout(() => {
      setActiveEmojis(prev => prev.filter(e => e.id !== emojiData.id));
    }, 3500); // Slightly longer duration
  };
  
  // Dual Video Control Functions
  const toggleCameraMinimize = () => {
    setCameraMinimized(!cameraMinimized);
  };
  
  const toggleScreenShareMinimize = () => {
    setScreenShareMinimized(!screenShareMinimized);
  };
  
  const toggleCameraMute = () => {
    setCameraMuted(!cameraMuted);
    if (cameraVideo.current) {
      const audioTrack = userStream?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = cameraMuted; // Invert because we're toggling
      }
    }
  };
  
  const toggleScreenShareMute = () => {
    setScreenShareMuted(!screenShareMuted);
    if (screenShareVideo.current) {
      const audioTrack = screenStream?.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = screenShareMuted; // Invert because we're toggling
      }
    }
  };
  
  const swapMainVideo = () => {
    if (isScreenSharing) {
      const newMainStream = mainVideoStream === 'camera' ? 'screen' : 'camera';
      setMainVideoStream(newMainStream);
      
      if (userVideo.current) {
        if (newMainStream === 'camera' && userStream) {
          userVideo.current.srcObject = userStream;
        } else if (newMainStream === 'screen' && screenStream) {
          userVideo.current.srcObject = screenStream;
        }
      }
    }
  };
  
  const resizeVideo = (type, size) => {
    if (type === 'camera') {
      setCameraSize(size);
    } else if (type === 'screen') {
      setScreenShareSize(size);
    }
  };

  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    socketRef.current?.emit('hand-raise-toggle', !isHandRaised);
  };
  
  // Host admission controls
  const admitParticipant = (participantId) => {
    if (isHost && socketRef.current) {
      socketRef.current.emit('admit-participant', { participantId, roomId });
    }
  };
  
  const rejectParticipant = (participantId) => {
    if (isHost && socketRef.current) {
      socketRef.current.emit('reject-participant', { participantId, roomId });
    }
  };
  
  const admitAll = () => {
    if (isHost && socketRef.current) {
      socketRef.current.emit('admit-all-participants', { roomId });
    }
  };
  
  const toggleWaitingRoom = () => {
    setShowWaitingRoom(!showWaitingRoom);
  };
  
  // Host meeting controls
  const startMeeting = () => {
    if (isHost && socketRef.current) {
      console.log('Host starting meeting...');
      socketRef.current.emit('start-meeting', { roomId });
      setMeetingStarted(true);
      setMeetingState('active');
      setCanJoinMeeting(true);
    }
  };
  
  const endMeetingForAll = () => {
    if (isHost && socketRef.current) {
      const confirmEnd = window.confirm('Are you sure you want to end the meeting for everyone?');
      if (confirmEnd) {
        console.log('Host ending meeting for all participants...');
        socketRef.current.emit('end-meeting', { 
          roomId, 
          message: 'The meeting has been ended by the host.' 
        });
        setMeetingState('ended');
        cleanup();
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }
    }
  };
  
  // More Options Functions
  const toggleCaptions = () => {
    setShowCaptions(!showCaptions);
    // Implementation for captions would go here
  };
  
  const showInviteOptions = () => {
    setShowInviteModal(true);
    setShowMoreOptions(false);
  };
  
  const copyInviteLink = () => {
    const inviteText = `Join my meeting\n${window.location.href}\nMeeting ID: ${roomId}`;
    navigator.clipboard.writeText(inviteText).then(() => {
      alert('Invite link copied to clipboard!');
    }).catch(() => {
      alert('Failed to copy link');
    });
    setShowInviteModal(false);
  };
  
  const openSettings = () => {
    setShowSettings(true);
    setShowMoreOptions(false);
  };
  
  const toggleSecurityOptions = () => {
    setShowSecurityOptions(!showSecurityOptions);
    setShowMoreOptions(false);
  };
  
  const sendFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', 'chat-file');
    
    try {
      const response = await fetch(`${SOCKET_SERVER_URL}/api/files/upload`, {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        const messageData = {
          sender: userName,
          message: `Shared file: ${file.name}`,
          type: 'file',
          fileUrl: data.file.url,
          fileName: file.name,
          time: new Date().toISOString()
        };
        
        socketRef.current?.emit("chat-message", messageData);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }
  };
  
  const muteAll = () => {
    if (isHost && socketRef.current) {
      socketRef.current.emit('mute-all-participants', { roomId });
    }
  };
  
  const stopAllVideo = () => {
    if (isHost && socketRef.current) {
      socketRef.current.emit('stop-all-video', { roomId });
    }
  };

  // Meeting Controls
  const endCall = () => {
    cleanup();
    if (onClose) {
      onClose();
    } else {
      navigate('/dashboard');
    }
  };

  const cleanup = () => {
    peersRef.current.forEach(({ peer }) => peer?.destroy?.());
    userStream?.getTracks().forEach(track => track.stop());
    screenStream?.getTracks().forEach(track => track.stop());
    socketRef.current?.disconnect();
  };

  const getReactionEmoji = (type) => {
    const emojis = {
      thumbsup: '👍',
      heart: '❤️',
      laugh: '😂',
      sad: '😢'
    };
    return emojis[type] || '😊';
  };

  // If user is in waiting room or meeting hasn't started, show appropriate UI
  if ((isInWaitingRoom && !isAdmitted) || (!meetingStarted && !canJoinMeeting)) {
    return (
      <div className="live-meeting-container waiting-room">
        <div className="waiting-room-content">
          <div className="waiting-room-header">
            <h2>{isHost ? 'Meeting Lobby' : 'Waiting to join meeting'}</h2>
            <p>Room ID: <span className="room-id">{roomId}</span></p>
          </div>
          
          <div className="waiting-room-body">
            <div className="waiting-icon">
              {isHost ? (
                <FaCrown className="crown-icon" />
              ) : (
                <FaHourglassHalf className="hourglass-icon" />
              )}
            </div>
            
            {isHost ? (
              <>
                <h3>You're the Host</h3>
                <p className="waiting-message">
                  You can start the meeting when you're ready. 
                  {participantsWaitingToJoin.length > 0 && 
                    ` ${participantsWaitingToJoin.length} participant(s) are waiting to join.`
                  }
                </p>
                
                {participantsWaitingToJoin.length > 0 && (
                  <div className="waiting-participants">
                    <h4>Waiting Participants:</h4>
                    <ul className="participants-list">
                      {participantsWaitingToJoin.map((participant, index) => (
                        <li key={index}>
                          <FaUser className="participant-icon" />
                          <span>{participant.userName}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="host-actions">
                  <button 
                    className="control-btn primary start-meeting-btn"
                    onClick={startMeeting}
                  >
                    <FaPlay />
                    <span>Start Meeting</span>
                  </button>
                  <button 
                    className="control-btn secondary"
                    onClick={endCall}
                  >
                    <FaTimes />
                    <span>Cancel Meeting</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3>Please wait</h3>
                <p className="waiting-message">{waitingMessage}</p>
                
                <div className="waiting-info">
                  <div className="user-info">
                    <FaUserCheck className="user-icon" />
                    <span>Joining as: <strong>{userName}</strong></span>
                  </div>
                </div>
                
                <div className="waiting-actions">
                  <button 
                    className="control-btn secondary"
                    onClick={endCall}
                  >
                    <FaTimes />
                    <span>Leave</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          <div className="waiting-room-footer">
            <p>
              {isHost 
                ? 'Start the meeting when all participants are ready.' 
                : 'The host will start the meeting soon.'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-meeting-container">
      {/* Top Bar */}
      <div className="meeting-topbar">
        <div className="topbar-left">
          <div className="meeting-info">
            <h3>Meeting Room: {roomId}</h3>
            {isHost && <FaCrown className="host-icon" />}
            {meetingLocked && <FaLock className="lock-icon" />}
          </div>
        </div>
        
        <div className="topbar-center">
          <div className="connection-status">
            <div className="signal-bars">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
        
        <div className="topbar-right">
          <button 
            className="view-toggle-btn"
            onClick={() => setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker')}
          >
            <FaTh />
            <span>{viewMode === 'speaker' ? 'Gallery' : 'Speaker'} View</span>
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="meeting-content">
        <div className={`video-area ${viewMode}-view`}>
          {viewMode === 'speaker' ? (
            <div className="speaker-layout">
              <div className="main-video-container">
                <video 
                  ref={userVideo} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="main-video"
                />
                <div className="video-overlay">
                  <div className="participant-name">
                    {userName} (You) - {mainVideoStream === 'camera' ? 'Camera' : 'Screen Share'}
                    {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                    {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                    {isScreenSharing && <FaDesktop className="screen-share-icon" title="Screen Sharing" />}
                  </div>
                  {isScreenSharing && (
                    <div className="main-video-controls">
                      <button 
                        className="video-control-btn swap-btn"
                        onClick={swapMainVideo}
                        title="Swap main video"
                      >
                        <FaExpand /> Swap
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Picture-in-Picture Camera during screen sharing */}
                {isScreenSharing && mainVideoStream === 'screen' && (
                  <div 
                    className={`pip-video camera-pip ${cameraMinimized ? 'minimized' : ''}`}
                    style={{
                      position: 'absolute',
                      top: cameraPosition.y,
                      left: cameraPosition.x,
                      width: cameraMinimized ? '120px' : `${cameraSize.width}px`,
                      height: cameraMinimized ? '90px' : `${cameraSize.height}px`,
                      zIndex: 10
                    }}
                  >
                    <video 
                      ref={cameraVideo}
                      autoPlay 
                      playsInline 
                      muted={cameraMuted}
                      className="pip-video-element"
                    />
                    <div className="pip-controls">
                      <button 
                        className="pip-control-btn"
                        onClick={toggleCameraMinimize}
                        title={cameraMinimized ? 'Maximize' : 'Minimize'}
                      >
                        {cameraMinimized ? <FaExpand /> : <FaCompress />}
                      </button>
                      <button 
                        className="pip-control-btn"
                        onClick={toggleCameraMute}
                        title={cameraMuted ? 'Unmute' : 'Mute'}
                      >
                        {cameraMuted ? <FaVolumeOff /> : <FaVolumeUp />}
                      </button>
                      <button 
                        className="pip-control-btn"
                        onClick={swapMainVideo}
                        title="Make main video"
                      >
                        <FaExpand />
                      </button>
                    </div>
                    <div className="pip-label">Camera</div>
                  </div>
                )}
                
                {/* Picture-in-Picture Screen Share when camera is main */}
                {isScreenSharing && mainVideoStream === 'camera' && (
                  <div 
                    className={`pip-video screen-pip ${screenShareMinimized ? 'minimized' : ''}`}
                    style={{
                      position: 'absolute',
                      top: screenSharePosition.y,
                      right: 20,
                      width: screenShareMinimized ? '160px' : `${screenShareSize.width}px`,
                      height: screenShareMinimized ? '120px' : `${screenShareSize.height}px`,
                      zIndex: 10
                    }}
                  >
                    <video 
                      ref={screenShareVideo}
                      autoPlay 
                      playsInline 
                      muted={screenShareMuted}
                      className="pip-video-element"
                    />
                    <div className="pip-controls">
                      <button 
                        className="pip-control-btn"
                        onClick={toggleScreenShareMinimize}
                        title={screenShareMinimized ? 'Maximize' : 'Minimize'}
                      >
                        {screenShareMinimized ? <FaExpand /> : <FaCompress />}
                      </button>
                      <button 
                        className="pip-control-btn"
                        onClick={toggleScreenShareMute}
                        title={screenShareMuted ? 'Unmute' : 'Mute'}
                      >
                        {screenShareMuted ? <FaVolumeOff /> : <FaVolumeUp />}
                      </button>
                      <button 
                        className="pip-control-btn"
                        onClick={swapMainVideo}
                        title="Make main video"
                      >
                        <FaExpand />
                      </button>
                    </div>
                    <div className="pip-label">Screen Share</div>
                  </div>
                )}
              </div>
              
              {peers.length > 0 && (
                <div className="participants-strip">
                  {peers.slice(0, 6).map((peer, index) => (
                    <VideoTile 
                      key={index} 
                      peer={peer.peer} 
                      userName={peer.userName}
                      isSmall={true}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="gallery-layout">
              <div className="video-grid">
                <div className="video-tile">
                  <video 
                    ref={userVideo} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="participant-video"
                  />
                  <div className="video-overlay">
                    <div className="participant-name">
                      {userName} (You)
                      {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                      {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                      {isScreenSharing && <FaDesktop className="screen-share-icon" title="Screen Sharing" />}
                    </div>
                    {isScreenSharing && (
                      <div className="screen-share-indicator">
                        <FaDesktop className="indicator-icon" />
                        <span>Screen sharing</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {peers.map((peer, index) => (
                  <VideoTile 
                    key={index} 
                    peer={peer.peer} 
                    userName={peer.userName}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reactions Overlay */}
        {(reactions.length > 0 || activeEmojis.length > 0) && (
          <div className="reactions-overlay">
            {reactions.map((reaction) => (
              <div key={reaction.id} className={`floating-reaction reaction-${reaction.type}`}>
                {getReactionEmoji(reaction.type)}
              </div>
            ))}
            {activeEmojis.map((emojiData) => (
              <div 
                key={emojiData.id} 
                className={`floating-emoji emoji-${emojiData.userId}`}
                style={{
                  left: emojiData.position?.left || '50%',
                  animationDelay: emojiData.position?.animationDelay || '0s'
                }}
              >
                <span className="emoji-character">{emojiData.emoji}</span>
                <span className="emoji-sender">{emojiData.userName}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="meeting-controls">
        <div className="controls-left">
          <div className="control-group">
            <button 
              className={`control-btn ${!isAudioOn ? 'danger' : 'primary'}`}
              onClick={toggleAudio}
              title={isAudioOn ? 'Mute' : 'Unmute'}
            >
              {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              <span>{isAudioOn ? 'Mute' : 'Unmute'}</span>
            </button>
            <button className="dropdown-btn" title="Audio settings">
              <FaChevronUp />
            </button>
          </div>

          <div className="control-group">
            <button 
              className={`control-btn ${!isVideoOn ? 'danger' : 'primary'}`}
              onClick={toggleVideo}
              title={isVideoOn ? 'Stop Video' : 'Start Video'}
            >
              {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
              <span>{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
            </button>
            <button className="dropdown-btn" title="Video settings">
              <FaChevronUp />
            </button>
          </div>
        </div>

        <div className="controls-center">
          <button 
            className={`control-btn secondary ${showParticipants ? 'active' : ''}`}
            onClick={() => setShowParticipants(!showParticipants)}
            title="Participants"
          >
            <FaUsers />
            <span>Participants</span>
          </button>

          <button 
            className={`control-btn secondary ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Chat"
          >
            <FaComment />
            <span>Chat</span>
          </button>

          {supportsScreenShare && (
            <div className="control-group">
              <button 
                className={`control-btn secondary ${isScreenSharing ? 'active' : ''}`}
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                title="Share Screen"
                disabled={!userStream}
              >
                <FaDesktop />
                <span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
              </button>
              <button className="dropdown-btn" title="Share options">
                <FaChevronUp />
              </button>
            </div>
          )}

          <button 
            className={`control-btn secondary ${isRecording ? 'danger' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            {isRecording ? <FaStop /> : <FaRecordVinyl />}
            <span>{isRecording ? 'Stop' : 'Record'}</span>
          </button>

          <button 
            className={`control-btn secondary ${showReactions ? 'active' : ''}`}
            onClick={() => setShowReactions(!showReactions)}
            title="Reactions"
          >
            <FaSmile />
            <span>Reactions</span>
          </button>

          {isHost && (
            <button 
              className={`control-btn secondary ${showWaitingRoom ? 'active' : ''}`}
              onClick={toggleWaitingRoom}
              title="Waiting Room"
            >
              <FaUserClock />
              <span>Waiting ({waitingParticipants.length})</span>
            </button>
          )}

          <button 
            className={`control-btn secondary ${showMoreOptions ? 'active' : ''}`}
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            title="More"
          >
            <FaEllipsisH />
            <span>More</span>
          </button>
        </div>

        <div className="controls-right">
          {isHost && (
            <button 
              className="control-btn danger end-btn"
              onClick={endMeetingForAll}
              title="End Meeting for All"
            >
              <FaPhone />
              <span>End for All</span>
            </button>
          )}
          <button 
            className="control-btn secondary"
            onClick={endCall}
            title={isHost ? "Leave Meeting" : "Leave Meeting"}
          >
            <FaTimes />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Reactions Panel */}
      {showReactions && (
        <div className="reactions-panel">
          <div className="panel-header">
            <h4>Quick Reactions</h4>
            <button 
              className="close-btn"
              onClick={() => setShowReactions(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="reactions-grid">
            <button onClick={() => sendReaction('thumbsup')} title="Thumbs Up">
              <FaThumbsUp /> <span>👍</span>
            </button>
            <button onClick={() => sendReaction('heart')} title="Heart">
              <FaHeart /> <span>❤️</span>
            </button>
            <button onClick={() => sendReaction('laugh')} title="Laugh">
              <FaLaugh /> <span>😂</span>
            </button>
            <button onClick={() => sendReaction('sad')} title="Sad">
              <FaSadTear /> <span>😢</span>
            </button>
          </div>
          
          <div className="emoji-section">
            <h5>More Emojis</h5>
            <button 
              className={`emoji-picker-btn ${showEmojiPicker ? 'active' : ''}`}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <FaSmile /> <span>Show More</span>
            </button>
            
            {showEmojiPicker && (
              <div className="emoji-picker">
                <div className="emoji-grid">
                  {['😀', '😂', '😍', '🥰', '😎', '🤔', '😮', '😱', '🙄', '😴', '🤗', '🤝', 
                    '👏', '🙌', '👍', '👎', '✊', '👌', '🤟', '✌️', '🤞', '🙏', '💪', '🔥',
                    '⭐', '✨', '🎉', '🎊', '❤️', '💙', '💚', '💛', '💜', '🧡', '🤍', '🖤'].map(emoji => (
                    <button 
                      key={emoji} 
                      className="emoji-btn"
                      onClick={() => sendEmoji(emoji)}
                      title={`Send ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="hand-raise-section">
            <button 
              className={`raise-hand-btn ${isHandRaised ? 'raised' : ''}`}
              onClick={toggleHandRaise}
            >
              <FaHandPaper />
              <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Participants Panel */}
      {showParticipants && (
        <div className="participants-panel">
          <div className="panel-header">
            <h3>Participants ({peers.length + 1})</h3>
            <button 
              className="close-btn"
              onClick={() => setShowParticipants(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          {isHost && (
            <div className="host-controls">
              <button className="host-control-btn" onClick={muteAll}>
                <FaMicrophoneSlash /> Mute All
              </button>
              <button className="host-control-btn" onClick={stopAllVideo}>
                <FaVideoSlash /> Stop All Video
              </button>
            </div>
          )}
          
          <div className="participants-list">
            <div className="participant-item">
              <div className="participant-info">
                <span className="participant-name">
                  {userName} (You)
                  {isHost && <FaCrown className="host-badge" />}
                </span>
                <div className="participant-status">
                  {!isAudioOn && <FaMicrophoneSlash className="status-muted" />}
                  {!isVideoOn && <FaVideoSlash className="status-video-off" />}
                  {isHandRaised && <FaHandPaper className="status-hand-raised" />}
                </div>
              </div>
            </div>
            
            {peers.map((peer, index) => (
              <div key={index} className="participant-item">
                <div className="participant-info">
                  <span className="participant-name">{peer.userName}</span>
                  <div className="participant-status">
                    {/* Status icons would be updated based on peer states */}
                  </div>
                </div>
                {isHost && (
                  <div className="participant-controls">
                    <button title="Mute participant" className="participant-control-btn">
                      <FaMicrophoneSlash />
                    </button>
                    <button title="Stop participant video" className="participant-control-btn">
                      <FaVideoSlash />
                    </button>
                    <button title="More options" className="participant-control-btn">
                      <FaEllipsisH />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="chat-panel">
          <div className="panel-header">
            <h3>Chat</h3>
            <button 
              className="close-btn"
              onClick={() => setShowChat(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="chat-messages" ref={chatContainerRef}>
            {chatMessages.map((msg, index) => (
              <div key={index} className="chat-message">
                <div className="message-header">
                  <span className="sender-name">{msg.sender}</span>
                  <span className="message-time">
                    {new Date(msg.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                <div className="message-content">{msg.message}</div>
              </div>
            ))}
            
            {typingUsers.length > 0 && (
              <div className="typing-indicator">
                {typingUsers.map(user => user.userName).join(', ')} 
                {typingUsers.length === 1 ? ' is' : ' are'} typing...
              </div>
            )}
          </div>
          
          <div className="chat-input-container">
            <div className="chat-input-row">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') sendMessage();
                  handleTyping();
                }}
                placeholder="Type a message..."
                className="chat-input"
              />
              <label className="file-input-btn">
                <FaFile />
                <input 
                  type="file" 
                  onChange={(e) => e.target.files[0] && sendFile(e.target.files[0])}
                  style={{display: 'none'}}
                />
              </label>
              <button className="send-btn" onClick={sendMessage}>
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waiting Room Panel (Host Only) */}
      {showWaitingRoom && isHost && (
        <div className="waiting-room-panel">
          <div className="panel-header">
            <h3>Waiting Room ({waitingParticipants.length})</h3>
            <button 
              className="close-btn"
              onClick={() => setShowWaitingRoom(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          <div className="waiting-room-content-panel">
            {waitingParticipants.length === 0 ? (
              <div className="no-waiting-participants">
                <FaUserClock className="empty-icon" />
                <p>No participants waiting</p>
              </div>
            ) : (
              <>
                <div className="waiting-room-actions">
                  <button 
                    className="control-btn secondary admit-all-btn"
                    onClick={admitAll}
                    title="Admit All"
                  >
                    <FaSignInAlt />
                    <span>Admit All</span>
                  </button>
                </div>
                
                <div className="waiting-participants-list">
                  {waitingParticipants.map((participant) => (
                    <div key={participant.socketId} className="waiting-participant-item">
                      <div className="participant-info">
                        <div className="participant-avatar">
                          <FaUserClock />
                        </div>
                        <div className="participant-details">
                          <span className="participant-name">{participant.userName}</span>
                          <span className="waiting-time">Waiting to join...</span>
                        </div>
                      </div>
                      
                      <div className="admission-controls">
                        <button 
                          className="admit-btn"
                          onClick={() => admitParticipant(participant.socketId)}
                          title="Admit"
                        >
                          <FaCheck />
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => rejectParticipant(participant.socketId)}
                          title="Reject"
                        >
                          <FaBan />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="waiting-room-footer">
            <p>Participants must wait for your approval to join the meeting.</p>
          </div>
        </div>
      )}

      {/* More Options Menu */}
      {showMoreOptions && (
        <div className="more-options-menu">
          <div className="options-section">
            <button className="option-item" onClick={showInviteOptions}>
              <FaUserPlus /> <span>Invite</span>
            </button>
            <button className="option-item" onClick={toggleCaptions}>
              <FaClosedCaptioning /> <span>{showCaptions ? 'Hide Captions' : 'Show Captions'}</span>
            </button>
            <button className="option-item" onClick={openSettings}>
              <FaCog /> <span>Settings</span>
            </button>
            {isHost && (
              <>
                <button className="option-item" onClick={toggleSecurityOptions}>
                  <FaShieldAlt /> <span>Security</span>
                </button>
                <button className="option-item" onClick={muteAll}>
                  <FaMicrophoneSlash /> <span>Mute All</span>
                </button>
                <button className="option-item" onClick={stopAllVideo}>
                  <FaVideoSlash /> <span>Stop All Video</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="invite-modal">
            <div className="modal-header">
              <h3>Invite Others</h3>
              <button 
                className="close-btn"
                onClick={() => setShowInviteModal(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="invite-info">
                <p><strong>Meeting ID:</strong> {roomId}</p>
                <p><strong>Meeting URL:</strong></p>
                <div className="url-display">
                  {window.location.href}
                </div>
              </div>
              <div className="invite-actions">
                <button className="control-btn primary" onClick={copyInviteLink}>
                  <FaClipboard /> Copy Invite Link
                </button>
                <button className="control-btn secondary" onClick={() => setShowInviteModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay">
          <div className="settings-modal">
            <div className="modal-header">
              <h3>Settings</h3>
              <button 
                className="close-btn"
                onClick={() => setShowSettings(false)}
              >
                <FaTimes />
              </button>
            </div>
            <div className="modal-content">
              <div className="settings-section">
                <h4>Audio & Video</h4>
                <label>
                  <input 
                    type="checkbox" 
                    checked={showCaptions}
                    onChange={toggleCaptions}
                  />
                  <span>Enable Captions</span>
                </label>
              </div>
              <div className="settings-section">
                <h4>Meeting</h4>
                <p>Room ID: {roomId}</p>
                {isHost && <p>You are the host of this meeting</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Options Menu */}
      {showSecurityOptions && isHost && (
        <div className="security-menu">
          <div className="security-header">
            <h4>Security Options</h4>
            <button 
              className="close-btn"
              onClick={() => setShowSecurityOptions(false)}
            >
              <FaTimes />
            </button>
          </div>
          <div className="security-options">
            <label className="security-option">
              <input 
                type="checkbox" 
                checked={meetingLocked}
                onChange={() => setMeetingLocked(!meetingLocked)}
              />
              <span>Lock Meeting</span>
            </label>
            <button className="security-action" onClick={muteAll}>
              <FaMicrophoneSlash /> Mute All Participants
            </button>
            <button className="security-action" onClick={stopAllVideo}>
              <FaVideoSlash /> Stop All Video
            </button>
          </div>
        </div>
      )}

      {/* Captions Display */}
      {showCaptions && (
        <div className="captions-overlay">
          <div className="captions-container">
            <p>Live captions would appear here...</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Video Tile Component
const VideoTile = ({ peer, userName, isSmall = false, isScreenSharing = false }) => {
  const ref = useRef();
  const [peerScreenSharing, setPeerScreenSharing] = useState(false);

  useEffect(() => {
    if (peer) {
      peer.on("stream", stream => {
        if (ref.current) {
          ref.current.srcObject = stream;
          
          // Check if this stream contains screen share (typically larger resolution)
          const videoTrack = stream.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            // Screen shares typically have much higher resolution than webcams
            const isLikelyScreenShare = settings.width && settings.height && 
                                      (settings.width > 1280 || settings.height > 720);
            setPeerScreenSharing(isLikelyScreenShare);
          }
        }
      });

      peer.on("error", console.warn);
    }
  }, [peer]);

  return (
    <div className={`video-tile ${isSmall ? 'small-tile' : ''} ${peerScreenSharing ? 'screen-sharing' : ''}`}>
      <video ref={ref} autoPlay playsInline className="peer-video" />
      <div className="video-overlay">
        <div className="participant-name">
          {userName}
          {peerScreenSharing && <FaDesktop className="screen-share-icon" title="Screen Sharing" />}
        </div>
        {peerScreenSharing && (
          <div className="screen-share-indicator">
            <FaDesktop className="indicator-icon" />
            <span>Screen sharing</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveMeeting;