import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  FaPause,
  FaWifi,
  FaSignal,
  FaBroadcastTower,
  FaExclamationTriangle,
  FaStar
} from 'react-icons/fa';
import './LiveMeetingEnhanced.css';
import { useUI } from '../contexts/UIContext';
import { useAuth } from '../contexts/AuthContext';
import HostRatingModal from './HostRatingModal';
import HostAwardModal from './HostAwardModal';
import CyberScoreBadge from './CyberScoreBadge';

const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

// Enhanced Video Tile Component with modern animations and dual-stream support
const EnhancedVideoTile = React.memo(({ 
  peer, 
  userName, 
  isSmall = false, 
  isMain = false, 
  onDoubleClick, 
  isScreenSharing = false,
  isAudioOn = true,
  isVideoOn = true,
  isHandRaised = false,
  hasCamera = true,
  isHost = false
}) => {
  const ref = useRef();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (peer) {
      const handleStream = (stream) => {
        if (ref.current) {
          ref.current.srcObject = stream;
          setIsLoading(false);
          setHasError(false);
        }
      };

      const handleError = (error) => {
        console.warn('Peer video error:', error);
        setHasError(true);
        setIsLoading(false);
      };

      peer.on("stream", handleStream);
      peer.on("error", handleError);

      return () => {
        peer.off("stream", handleStream);
        peer.off("error", handleError);
      };
    }
  }, [peer]);

  const tileClasses = useMemo(() => {
    return [
      'video-tile',
      isSmall && 'small-tile',
      isMain && 'main-tile',
      isScreenSharing && 'screen-sharing',
      isLoading && 'loading',
      hasError && 'error',
      isHovered && 'hovered'
    ].filter(Boolean).join(' ');
  }, [isSmall, isMain, isScreenSharing, isLoading, hasError, isHovered]);

  return (
    <div 
      className={tileClasses}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDoubleClick={onDoubleClick}
    >
      {isLoading && (
        <div className="video-loading">
          <div className="loading-spinner"></div>
          <p>Connecting...</p>
        </div>
      )}
      
      {hasError && (
        <div className="video-error">
          <FaSignal className="error-icon" />
          <p>Connection Error</p>
        </div>
      )}

      <video 
        ref={ref} 
        autoPlay 
        playsInline 
        className="peer-video"
        style={{ display: isLoading || hasError ? 'none' : 'block' }}
      />
      
      <div className="video-overlay">
        <div className="participant-info">
          <span className="participant-name">
            {userName}
            {isHost && <FaCrown className="host-badge" />}
            {!isAudioOn && <FaMicrophoneSlash className="status-muted" />}
            {!isVideoOn && <FaVideoSlash className="status-video-off" />}
            {isHandRaised && <FaHandPaper className="status-hand-raised" />}
            {isScreenSharing && <FaDesktop className="screen-share-icon" />}
          </span>
        </div>
        
      </div>

      {isScreenSharing && (
        <div className="screen-share-indicator">
          <FaDesktop className="indicator-icon" />
          <span>Screen Sharing</span>
        </div>
      )}
      
    </div>
  );
});

// Enhanced Connection Quality Indicator
const ConnectionQualityIndicator = ({ quality = 'good' }) => {
  const qualityConfig = {
    excellent: { bars: 4, color: 'var(--accent-success)', label: 'Excellent' },
    good: { bars: 3, color: 'var(--accent-success)', label: 'Good' },
    fair: { bars: 2, color: 'var(--accent-warning)', label: 'Fair' },
    poor: { bars: 1, color: 'var(--accent-danger)', label: 'Poor' }
  };

  const config = qualityConfig[quality] || qualityConfig.good;

  return (
    <div className="connection-quality-indicator" title={`Connection: ${config.label}`}>
      <div className="signal-bars">
        {[1, 2, 3, 4].map(bar => (
          <span 
            key={bar}
            className={bar <= config.bars ? 'active' : 'inactive'}
            style={{ 
              backgroundColor: bar <= config.bars ? config.color : 'var(--text-quaternary)',
              height: `${bar * 4}px`
            }}
          />
        ))}
      </div>
    </div>
  );
};

// Enhanced Floating Reaction Component
const FloatingReaction = ({ emoji, sender, position, onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className="floating-emoji"
      style={{
        left: position?.left || '50%',
        animationDelay: position?.animationDelay || '0s'
      }}
    >
      <span className="emoji-character">{emoji}</span>
      <span className="emoji-sender">{sender}</span>
    </div>
  );
};

// Main Enhanced LiveMeeting Component
const EnhancedLiveMeeting = ({ 
  roomId: propRoomId, 
  userName: propUserName, 
  onClose 
}) => {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { enterImmersiveMode, exitImmersiveMode } = useUI();
  const { user, isAuthenticated } = useAuth();

  // Use props if provided, otherwise use route params
  const roomId = propRoomId || paramRoomId;
  const userName = propUserName || location.state?.userName || user?.firstName + ' ' + user?.lastName || "Guest";
  const userId = user?.id || user?._id;

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
  const [compositeStreamCleanup, setCompositeStreamCleanup] = useState(null);

  // UI State
  const [viewMode, setViewMode] = useState('speaker');
  const [showChat, setShowChat] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [pinnedParticipant, setPinnedParticipant] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState([]);

  // Meeting State
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [activeEmojis, setActiveEmojis] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  
  // Additional UI State
  const [showCaptions, setShowCaptions] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSecurityOptions, setShowSecurityOptions] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');

  // Meeting Controls State
  const [isHost, setIsHost] = useState(false);
  const [meetingLocked, setMeetingLocked] = useState(false);
  const [meetingState, setMeetingState] = useState('waiting');
  const [isInWaitingRoom, setIsInWaitingRoom] = useState(false);
  const [waitingParticipants, setWaitingParticipants] = useState([]);
  const [waitingMessage, setWaitingMessage] = useState('');
  const [isAdmitted, setIsAdmitted] = useState(false);

  // Enhanced reactions with position tracking
  const [reactions, setReactions] = useState([]);
  
  // Notification State
  const [notifications, setNotifications] = useState([]);
  
  // Cyber Score and Rating State
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedParticipantForRating, setSelectedParticipantForRating] = useState(null);
  const [showAwardModal, setShowAwardModal] = useState(false);
  const [selectedParticipantForAward, setSelectedParticipantForAward] = useState(null);
  const [cyberScores, setCyberScores] = useState({});
  
  // Current user information for rating
  const currentUser = {
    id: userId,
    name: userName
  };
  
  // Enter immersive mode on mount
  useEffect(() => {
    enterImmersiveMode();
    return () => exitImmersiveMode();
  }, [enterImmersiveMode, exitImmersiveMode]);

  // Initialize connection
  useEffect(() => {
    initializeConnection();
    return cleanup;
  }, [roomId, userName]);

  // Enhanced connection initialization
  const initializeConnection = async () => {
    try {
      // Get user media with enhanced constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 }, 
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      });

      setUserStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      // Enhanced screen sharing support detection
      const isScreenShareSupported = navigator.mediaDevices && 
                                   navigator.mediaDevices.getDisplayMedia && 
                                   (window.location.protocol === 'https:' || window.location.hostname === 'localhost');
      setSupportsScreenShare(isScreenShareSupported);

      // Initialize socket with enhanced configuration
      socketRef.current = io(SOCKET_SERVER_URL, {
        transports: ['websocket'],
        upgrade: false,
        rememberUpgrade: false
      });

      setupEnhancedSocketHandlers(stream);

    } catch (error) {
      console.error("Error accessing media:", error);
      
      // Enhanced error handling with user-friendly messages
      const errorMessages = {
        'NotFoundError': 'No camera or microphone found. Please connect your devices and refresh.',
        'NotAllowedError': 'Camera and microphone access denied. Please allow permissions and refresh.',
        'NotReadableError': 'Camera or microphone is already in use by another application.',
        'OverconstrainedError': 'Camera settings not supported. Trying with default settings...',
        'AbortError': 'Media access was interrupted. Please try again.',
        'NotSupportedError': 'Your browser doesn\'t support the required media features.'
      };

      const userMessage = errorMessages[error.name] || "Please allow camera and microphone access to join the meeting.";
      alert(userMessage);

      // Try fallback with basic constraints if overconstrained
      if (error.name === 'OverconstrainedError') {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
          });
          setUserStream(fallbackStream);
          if (userVideo.current) {
            userVideo.current.srcObject = fallbackStream;
          }
        } catch (fallbackError) {
          console.error("Fallback media access failed:", fallbackError);
        }
      }
    }
  };

  // Enhanced socket handlers with better error handling and reconnection
  const setupEnhancedSocketHandlers = (stream) => {
    const socket = socketRef.current;

    // Connection quality monitoring
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionQuality('excellent');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionQuality('poor');
    });

    socket.on('connect_error', () => {
      console.log('Connection error');
      setConnectionQuality('poor');
    });

    socket.emit("join-room", { roomId, userId, userName });
    
    // Enhanced host status handling
    socket.on("host-status", (data) => {
      setIsHost(data.isHost);
      setIsAdmitted(data.isHost || data.isAdmitted);
      
      if (data.isHost) {
        console.log('You are the host of this meeting');
        setMeetingState('active');
      } else {
        setIsInWaitingRoom(!data.isAdmitted);
        setMeetingState(data.meetingStarted ? 'active' : 'waiting');
        if (!data.isAdmitted) {
          setWaitingMessage('Waiting for the host to admit you...');
        }
      }
    });

    // Enhanced peer handling with error recovery
    socket.on("existing-users", (users) => {
      const newPeers = users.map(user => {
        try {
          const peer = createPeer(user.socketId, socket.id, stream);
          peersRef.current.push({ peerID: user.socketId, peer, userName: user.userName, userId: user.userId, isHost: user.isHost });
          return { 
            peer, 
            userName: user.userName, 
            userId: user.userId,
            socketId: user.socketId,
            isHost: user.isHost || false,
            isAudioOn: true,
            isVideoOn: true,
            cyberScore: user.cyberScore
          };
        } catch (error) {
          console.error('Error creating peer for existing user:', error);
          return null;
        }
      }).filter(Boolean);
      
      setPeers(newPeers);
      setParticipantsList(users);
    });

    socket.on("user-connected", (userInfo) => {
      try {
        const peer = addPeer(null, userInfo.socketId, stream);
        peersRef.current.push({ peerID: userInfo.socketId, peer, userName: userInfo.userName, userId: userInfo.userId, isHost: userInfo.isHost });
        const newPeer = { 
          peer, 
          userName: userInfo.userName, 
          userId: userInfo.userId,
          socketId: userInfo.socketId,
          isHost: userInfo.isHost || false,
          isAudioOn: true,
          isVideoOn: true,
          cyberScore: userInfo.cyberScore
        };
        setPeers(prev => [...prev, newPeer]);
        setParticipantsList(prev => [...prev, userInfo]);
      } catch (error) {
        console.error('Error handling new user connection:', error);
      }
    });

    // Enhanced signaling with error handling
    socket.on("signal", ({ from, signal }) => {
      const item = peersRef.current.find(p => p.peerID === from);
      if (item?.peer && !item.peer.destroyed) {
        try {
          item.peer.signal(signal);
        } catch (error) {
          console.warn('Error processing signal:', error);
        }
      }
    });

    // Enhanced user disconnection handling
    socket.on("user-disconnected", ({ socketId }) => {
      const peerObj = peersRef.current.find(p => p.peerID === socketId);
      if (peerObj?.peer) {
        try {
          peerObj.peer.destroy();
        } catch (error) {
          console.warn('Error destroying peer:', error);
        }
      }
      peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
      setPeers(prev => prev.filter(p => p.socketId !== socketId));
      setParticipantsList(prev => prev.filter(p => p.socketId !== socketId));
    });

    // Enhanced chat handling
    socket.on("chat-message", (data) => {
      setChatMessages(prev => [...prev, { ...data, id: Date.now() + Math.random() }]);
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      }, 100);
    });

    // Enhanced typing indicators
    socket.on("user-typing", ({ userId, userName: typingUserName }) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== userId);
        return [...filtered, { userId, userName: typingUserName }];
      });
    });

    socket.on("user-stop-typing", ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // Enhanced emoji reactions
    socket.on("emoji-reaction", (data) => {
      const { emojiData } = data;
      
      if (emojiData.userId === socket.id) {
        return; // Don't show our own reactions
      }
      
      if (!emojiData.position) {
        emojiData.position = {
          left: `${15 + Math.random() * 70}%`,
          animationDelay: `${Math.random() * 0.5}s`
        };
      }
      
      setActiveEmojis(prev => [...prev, { ...emojiData, id: Date.now() + Math.random() }]);
    });

    // Waiting room status handler
    socket.on("waiting-room-status", (data) => {
      console.log('Received waiting room status:', data);
      if (data.inWaitingRoom) {
        setIsInWaitingRoom(true);
        setIsAdmitted(false);
        setMeetingState('waiting');
        setWaitingMessage(data.message || 'Waiting for the host to admit you...');
      }
    });

    // Waiting room management for hosts
    socket.on("waiting-participants-update", (participants) => {
      console.log('Host received waiting participants update:', participants);
      setWaitingParticipants(participants);
    });

    socket.on("admitted-to-meeting", () => {
      console.log('User admitted to meeting');
      setIsInWaitingRoom(false);
      setIsAdmitted(true);
      setMeetingState('active');
      setWaitingMessage('');
    });

    socket.on("admission-rejected", (data) => {
      console.log('Admission automatically rejected:', data);
      setWaitingMessage(data.reason || 'Access denied due to account restrictions');
      setIsInWaitingRoom(false);
      setMeetingState('rejected');
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 3000);
    });

    socket.on("rejected-from-meeting", (data) => {
      console.log('Rejected by host:', data);
      setWaitingMessage(data.message || 'Access denied by host');
      setIsInWaitingRoom(false);
      setMeetingState('rejected');
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 3000);
    });

    // Handle socket errors
    socket.on("error", (error) => {
      console.error('Socket error:', error);
      showNotification(error.message || 'Connection error', 'error');
    });

    // Host control events - when host controls affect current user
    socket.on("host-muted-you", (data) => {
      if (userStream) {
        const audioTrack = userStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsAudioOn(false);
        }
      }
      showNotification(`You have been muted by the host (${data.hostName})`, 'warning', 4000);
    });

    socket.on("host-disabled-your-video", (data) => {
      if (userStream) {
        const videoTrack = userStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoOn(false);
        }
      }
      showNotification(`Your video has been disabled by the host (${data.hostName})`, 'info', 4000);
    });

    socket.on("host-removed-you", (data) => {
      showNotification(`You have been removed from the meeting by the host (${data.hostName}). Reason: ${data.reason}`, 'error', 6000);
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else {
          navigate('/dashboard');
        }
      }, 6000);
    });

    socket.on("host-muted-all", (data) => {
      if (userStream) {
        const audioTrack = userStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = false;
          setIsAudioOn(false);
        }
      }
      showNotification(`All participants have been muted by the host (${data.hostName})`, 'warning', 4000);
    });

    socket.on("host-disabled-all-videos", (data) => {
      if (userStream) {
        const videoTrack = userStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = false;
          setIsVideoOn(false);
        }
      }
      showNotification(`All participant videos have been disabled by the host (${data.hostName})`, 'info', 4000);
    });

    // Participant status updates for UI
    socket.on("participant-status-update", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.participantId) {
          return {
            ...peer,
            isAudioOn: data.isAudioOn,
            isVideoOn: data.isVideoOn
          };
        }
        return peer;
      }));
    });

    // Hand raise synchronization
    socket.on("user-hand-raise", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isHandRaised: data.isHandRaised
          };
        }
        return peer;
      }));
      
      // Show notification when someone raises/lowers hand
      if (data.isHandRaised) {
        showNotification(`${data.userName} raised their hand`, 'info', 3000);
      }
    });

    // Screen sharing synchronization
    socket.on("user-screen-share", (data) => {
      console.log('📡 Received user-screen-share event:', data);
      
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          const updatedPeer = {
            ...peer,
            isScreenSharing: true,
            hasCamera: data.hasCamera || false,
            screenShareVideoOn: data.isVideoOn || false
          };
          console.log('📺 Updated peer for screen sharing:', updatedPeer);
          return updatedPeer;
        }
        return peer;
      }));
      
      showNotification(`${data.userName} started screen sharing`, 'info', 3000);
    });

    socket.on("user-stop-screen-share", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isScreenSharing: false,
            hasCamera: true, // Reset to default
            screenShareVideoOn: false
          };
        }
        return peer;
      }));
      
      showNotification(`${data.userName} stopped screen sharing`, 'info', 3000);
    });

    // Audio/Video toggle synchronization from other participants
    socket.on("user-toggle-audio", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isAudioOn: data.isAudioOn
          };
        }
        return peer;
      }));
    });

    socket.on("user-toggle-video", (data) => {
      setPeers(prev => prev.map(peer => {
        if (peer.socketId === data.socketId) {
          return {
            ...peer,
            isVideoOn: data.isVideoOn
          };
        }
        return peer;
      }));
    });
  };

  // Enhanced peer creation with better error handling
  const createPeer = useCallback((userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on("signal", signal => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("signal", { to: userToSignal, from: callerID, signal });
      }
    });

    peer.on("error", error => {
      console.warn('Peer connection error:', error);
      // Attempt reconnection logic could be added here
    });

    peer.on("connect", () => {
      console.log('Peer connected successfully');
      setConnectionQuality('good');
    });

    return peer;
  }, []);

  const addPeer = useCallback((incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    });

    peer.on("signal", signal => {
      if (socketRef.current?.connected) {
        socketRef.current.emit("signal", { to: callerID, from: socketRef.current.id, signal });
      }
    });

    peer.on("error", error => {
      console.warn('Peer connection error:', error);
    });

    if (incomingSignal) {
      try {
        peer.signal(incomingSignal);
      } catch (error) {
        console.warn('Error signaling incoming peer:', error);
      }
    }

    return peer;
  }, []);

  // Enhanced media controls with smooth transitions
  const toggleAudio = useCallback(() => {
    if (userStream) {
      const audioTrack = userStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
        socketRef.current?.emit("toggle-audio", !isAudioOn);
        
        // Add haptic feedback on mobile
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }
  }, [isAudioOn, userStream]);

  const toggleVideo = useCallback(() => {
    if (userStream) {
      const videoTrack = userStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
        socketRef.current?.emit("toggle-video", !isVideoOn);
        
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      }
    }
  }, [isVideoOn, userStream]);

  // Canvas composition for dual-stream (screen + camera)
  const createCompositeStream = useCallback((screenStream, cameraStream) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const screenVideo = document.createElement('video');
    const cameraVideo = document.createElement('video');
    
    // Set canvas size to match screen share
    canvas.width = 1920;
    canvas.height = 1080;
    
    // Setup video elements
    screenVideo.srcObject = screenStream;
    screenVideo.autoplay = true;
    screenVideo.muted = true;
    
    cameraVideo.srcObject = cameraStream;
    cameraVideo.autoplay = true;
    cameraVideo.muted = true;
    
    // Camera overlay dimensions and position
    const cameraWidth = 200;
    const cameraHeight = 150;
    const cameraX = canvas.width - cameraWidth - 20; // 20px from right edge
    const cameraY = 20; // 20px from top edge
    
    let animationFrame;
    
    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw screen share (full canvas)
      if (screenVideo.readyState >= 3) { // HAVE_FUTURE_DATA
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
      }
      
      // Draw camera overlay with rounded corners and border
      if (cameraVideo.readyState >= 3 && isVideoOn) {
        ctx.save();
        
        // Create rounded rectangle path for camera (with fallback)
        const radius = 12;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(cameraX, cameraY, cameraWidth, cameraHeight, radius);
        } else {
          // Fallback for browsers without roundRect support
          ctx.rect(cameraX, cameraY, cameraWidth, cameraHeight);
        }
        ctx.clip();
        
        // Draw camera video
        ctx.drawImage(cameraVideo, cameraX, cameraY, cameraWidth, cameraHeight);
        
        ctx.restore();
        
        // Draw border around camera
        ctx.strokeStyle = '#06B6D4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(cameraX, cameraY, cameraWidth, cameraHeight, radius);
        } else {
          ctx.rect(cameraX, cameraY, cameraWidth, cameraHeight);
        }
        ctx.stroke();
        
        // Add "YOU" label
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(cameraX, cameraY + cameraHeight - 25, cameraWidth, 25);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('YOU', cameraX + cameraWidth/2, cameraY + cameraHeight - 8);
      }
      
      animationFrame = requestAnimationFrame(draw);
    };
    
    // Wait for both videos to be ready
    let screenReady = false;
    let cameraReady = false;
    
    const startDrawing = () => {
      if (screenReady && cameraReady) {
        draw();
      }
    };
    
    screenVideo.addEventListener('loadedmetadata', () => {
      // Adjust canvas size to match actual screen dimensions
      canvas.width = screenVideo.videoWidth || 1920;
      canvas.height = screenVideo.videoHeight || 1080;
    });
    
    screenVideo.addEventListener('canplay', () => {
      screenReady = true;
      startDrawing();
    });
    
    cameraVideo.addEventListener('canplay', () => {
      cameraReady = true;
      startDrawing();
    });
    
    // Force video loading
    screenVideo.load();
    cameraVideo.load();
    
    // Create stream from canvas
    const compositeStream = canvas.captureStream(30); // 30 FPS
    
    // Add audio tracks
    const audioTracks = screenStream.getAudioTracks();
    audioTracks.forEach(track => compositeStream.addTrack(track));
    
    const cameraAudioTracks = cameraStream.getAudioTracks();
    cameraAudioTracks.forEach(track => compositeStream.addTrack(track));
    
    // Cleanup function
    const cleanup = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      screenVideo.srcObject = null;
      cameraVideo.srcObject = null;
    };
    
    return { compositeStream, cleanup };
  }, [isVideoOn]);

  // Enhanced screen sharing with dual-stream support
  const startScreenShare = useCallback(async () => {
    if (!supportsScreenShare) {
      alert('Screen sharing is not supported in this browser or requires HTTPS.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always',
          displaySurface: 'monitor',
          logicalSurface: true,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // Keep camera video in userVideo, put screen share in dedicated element
      if (screenShareVideo.current) {
        screenShareVideo.current.srcObject = stream;
      }

      // Create dual-stream composite (screen + camera)
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack && userStream && userStream.getVideoTracks().length > 0) {
        try {
          // Create composite stream with both screen and camera
          const { compositeStream, cleanup } = createCompositeStream(stream, userStream);
          
          // Store cleanup function for later
          setCompositeStreamCleanup(() => cleanup);
          
          // Send composite stream to all peers
          const compositeVideoTrack = compositeStream.getVideoTracks()[0];
          if (compositeVideoTrack) {
            peersRef.current.forEach(({ peer }) => {
              if (peer && !peer.destroyed) {
                try {
                  const sender = peer._pc?.getSenders?.()?.find(s => 
                    s.track && s.track.kind === 'video'
                  );
                  
                  if (sender && sender.replaceTrack) {
                    sender.replaceTrack(compositeVideoTrack).catch(error => {
                      console.warn('Failed to send composite stream:', error);
                    });
                  }
                } catch (error) {
                  console.warn('Error sending composite stream to peer:', error);
                }
              }
            });
          }
          
        } catch (error) {
          console.error('Error creating composite stream:', error);
          
          // Fallback to screen share only
          peersRef.current.forEach(({ peer }) => {
            if (peer && !peer.destroyed) {
              try {
                const sender = peer._pc?.getSenders?.()?.find(s => 
                  s.track && s.track.kind === 'video'
                );
                
                if (sender && sender.replaceTrack) {
                  sender.replaceTrack(videoTrack).catch(error => {
                    console.warn('Fallback: Failed to replace video track:', error);
                  });
                }
              } catch (fallbackError) {
                console.warn('Fallback also failed:', fallbackError);
              }
            }
          });
        }
      } else {
        console.log('📺 Sending screen share only (no camera available)');
        
        // Send screen share only if no camera available
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            try {
              const sender = peer._pc?.getSenders?.()?.find(s => 
                s.track && s.track.kind === 'video'
              );
              
              if (sender && sender.replaceTrack) {
                sender.replaceTrack(videoTrack).catch(error => {
                  console.warn('Failed to replace video track:', error);
                });
              }
            } catch (error) {
              console.warn('Error replacing track for screen share:', error);
            }
          }
        });
      }

      const screenShareData = { 
        userId: socketRef.current.id, 
        userName,
        hasCamera: !!userStream && userStream.getVideoTracks().length > 0,
        isVideoOn: isVideoOn
      };
      
      console.log('📤 Emitting start-screen-share:', screenShareData);
      socketRef.current?.emit("start-screen-share", screenShareData);

      // Handle screen share end
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error("Error starting screen share:", error);
      setIsScreenSharing(false);
      
      const errorMessages = {
        'NotAllowedError': 'Screen sharing permission denied. Please try again.',
        'NotFoundError': 'No screen available for sharing.',
        'NotSupportedError': 'Screen sharing is not supported in this browser.',
        'AbortError': 'Screen sharing was cancelled.'
      };

      const userMessage = errorMessages[error.name] || 'Failed to start screen sharing. Please try again.';
      alert(userMessage);
    }
  }, [supportsScreenShare, userStream, userName]);

  // Enhanced screen share stop with dual-stream support
  const stopScreenShare = useCallback(() => {
    console.log('🚫 Stopping screen share and cleaning up composite stream...');
    
    // Clean up composite stream
    if (compositeStreamCleanup) {
      try {
        compositeStreamCleanup();
        setCompositeStreamCleanup(null);
        console.log('✅ Composite stream cleaned up');
      } catch (error) {
        console.warn('Error cleaning up composite stream:', error);
      }
    }
    
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
    
    // Camera video stays in userVideo.current (no need to restore)
    // Just clear the screen share video element
    if (screenShareVideo.current) {
      screenShareVideo.current.srcObject = null;
    }

    // Restore camera track in peer connections
    if (userStream) {
      const cameraVideoTrack = userStream.getVideoTracks()[0];
      if (cameraVideoTrack) {
        peersRef.current.forEach(({ peer }) => {
          if (peer && !peer.destroyed) {
            try {
              const sender = peer._pc?.getSenders?.()?.find(s => 
                s.track && s.track.kind === 'video'
              );
              
              if (sender && sender.replaceTrack) {
                sender.replaceTrack(cameraVideoTrack).catch(error => {
                  console.warn('Failed to restore camera track:', error);
                });
              }
            } catch (error) {
              console.warn('Error restoring camera track:', error);
            }
          }
        });
      }
    }

    socketRef.current?.emit("stop-screen-share", { userId: socketRef.current.id, userName });
  }, [screenStream, userStream, userName, compositeStreamCleanup]);

  // Enhanced chat functions
  const sendMessage = useCallback(() => {
    if (message.trim() && socketRef.current) {
      const messageData = {
        sender: userName,
        message: message.trim(),
        type: 'text',
        time: new Date().toISOString(),
        id: Date.now() + Math.random()
      };
      
      socketRef.current.emit("chat-message", messageData);
      setMessage("");
      socketRef.current.emit("typing-stop");
    }
  }, [message, userName]);

  // Enhanced typing handler with debounce
  const handleTyping = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit("typing-start");
      
      // Debounce typing stop
      clearTimeout(handleTyping.timeoutId);
      handleTyping.timeoutId = setTimeout(() => {
        socketRef.current?.emit("typing-stop");
      }, 2000);
    }
  }, []);

  // Enhanced emoji system
  const sendEmoji = useCallback((emoji) => {
    setShowEmojiPicker(false);
    setShowReactions(false);
    
    const emojiData = { 
      emoji, 
      userId: socketRef.current?.id || `user_${Date.now()}`,
      userName: userName,
      id: `emoji_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      position: {
        left: `${15 + Math.random() * 70}%`,
        animationDelay: `${Math.random() * 0.5}s`
      }
    };
    
    // Add to local state immediately
    setActiveEmojis(prev => [...prev, emojiData]);
    
    // Broadcast to other participants
    if (socketRef.current?.connected) {
      socketRef.current.emit('emoji-reaction', {
        roomId: roomId,
        emojiData: emojiData
      });
    }
  }, [roomId, userName]);

  // Enhanced reaction removal
  const handleReactionComplete = useCallback((reactionId) => {
    setActiveEmojis(prev => prev.filter(e => e.id !== reactionId));
  }, []);

  // Enhanced hand raise toggle
  const toggleHandRaise = useCallback(() => {
    setIsHandRaised(!isHandRaised);
    socketRef.current?.emit('hand-raise-toggle', !isHandRaised);
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  }, [isHandRaised]);

  // Memoized values for performance (moved here to be available for host controls)
  const activePeers = useMemo(() => peers.filter(p => p.peer && !p.peer.destroyed), [peers]);
  const totalParticipants = activePeers.length + 1; // +1 for current user

  // Notification helper (moved up to be available for other functions)
  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, timestamp: Date.now() };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after duration
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  // Host controls
  const admitParticipant = useCallback((participantId) => {
    console.log('Admit participant called:', { participantId, roomId, isHost, socketConnected: !!socketRef.current });
    if (isHost && socketRef.current) {
      console.log('Emitting admit-participant event...');
      socketRef.current.emit('admit-participant', { participantId, roomId });
      showNotification('Attempting to admit participant...', 'info', 2000);
    } else {
      console.log('Cannot admit participant - not host or no socket connection');
      showNotification('Unable to admit participant', 'error');
    }
  }, [isHost, roomId, showNotification]);

  const rejectParticipant = useCallback((participantId) => {
    console.log('Reject participant called:', { participantId, roomId, isHost, socketConnected: !!socketRef.current });
    if (isHost && socketRef.current) {
      console.log('Emitting reject-participant event...');
      socketRef.current.emit('reject-participant', { participantId, roomId });
      showNotification('Attempting to reject participant...', 'info', 2000);
    } else {
      console.log('Cannot reject participant - not host or no socket connection');
      showNotification('Unable to reject participant', 'error');
    }
  }, [isHost, roomId, showNotification]);

  // Enhanced host controls for individual participants
  const muteParticipant = useCallback((participantId, participantName) => {
    if (isHost && socketRef.current) {
      if (window.confirm(`Mute ${participantName}?`)) {
        socketRef.current.emit('host-mute-participant', { 
          participantId, 
          roomId,
          hostName: userName 
        });
        
        // Show feedback message
        console.log(`Host muted ${participantName}`);
      }
    }
  }, [isHost, roomId, userName]);

  const disableParticipantVideo = useCallback((participantId, participantName) => {
    if (isHost && socketRef.current) {
      if (window.confirm(`Stop ${participantName}'s video?`)) {
        socketRef.current.emit('host-disable-video', { 
          participantId, 
          roomId,
          hostName: userName 
        });
        
        console.log(`Host disabled ${participantName}'s video`);
      }
    }
  }, [isHost, roomId, userName]);

  const removeParticipant = useCallback((participantId, participantName) => {
    if (isHost && socketRef.current) {
      if (window.confirm(`Remove ${participantName} from the meeting?\n\nThis action cannot be undone.`)) {
        socketRef.current.emit('host-remove-participant', { 
          participantId, 
          roomId,
          hostName: userName,
          reason: 'Removed by host'
        });
        
        console.log(`Host removed ${participantName} from meeting`);
      }
    }
  }, [isHost, roomId, userName]);

  // Bulk host controls
  const muteAllParticipants = useCallback(() => {
    if (isHost && socketRef.current && activePeers.length > 0) {
      if (window.confirm(`Mute all participants (${activePeers.length})?`)) {
        socketRef.current.emit('host-mute-all', { 
          roomId,
          hostName: userName 
        });
        
        console.log('Host muted all participants');
      }
    }
  }, [isHost, roomId, userName, activePeers.length]);

  const disableAllVideos = useCallback(() => {
    if (isHost && socketRef.current && activePeers.length > 0) {
      if (window.confirm(`Stop all participants' videos (${activePeers.length})?`)) {
        socketRef.current.emit('host-disable-all-videos', { 
          roomId,
          hostName: userName 
        });
        
        console.log('Host disabled all participant videos');
      }
    }
  }, [isHost, roomId, userName, activePeers.length]);

  // Meeting controls
  const endCall = useCallback(() => {
    cleanup();
    if (onClose) {
      onClose();
    } else {
      navigate('/dashboard');
    }
  }, [onClose, navigate]);

  const cleanup = useCallback(() => {
    peersRef.current.forEach(({ peer }) => {
      try {
        if (peer && !peer.destroyed) {
          peer.destroy();
        }
      } catch (error) {
        console.warn('Error destroying peer during cleanup:', error);
      }
    });
    
    userStream?.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Error stopping user stream track:', error);
      }
    });
    
    screenStream?.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (error) {
        console.warn('Error stopping screen stream track:', error);
      }
    });
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  }, [userStream, screenStream]);

  // Cyber Score and Rating Functions
  const openRatingModal = useCallback((participant) => {
    if (!isHost) {
      showNotification('Only the host can rate participants', 'warning');
      return;
    }
    
    setSelectedParticipantForRating(participant);
    setShowRatingModal(true);
  }, [isHost, showNotification]);
  
  const openAwardModal = useCallback((participant) => {
    if (!isHost) {
      showNotification('Only the host can award participants', 'warning');
      return;
    }
    
    setSelectedParticipantForAward(participant);
    setShowAwardModal(true);
  }, [isHost, showNotification]);
  
  const submitParticipantRating = useCallback(async (participantSocketId, ratingData) => {
    try {
      // Find the participant by socketId
      const participant = activePeers.find(p => p.socketId === participantSocketId);
      if (!participant) {
        throw new Error('Participant not found');
      }
      
      // Use participant's userId, but fallback to socketId if not available
      const targetUserId = participant.userId || participant.socketId;
      
      if (!targetUserId) {
        throw new Error('Unable to identify participant for rating');
      }
      
      console.log('Submitting rating for participant:', {
        userName: participant.userName,
        userId: participant.userId,
        socketId: participant.socketId,
        targetUserId,
        ratingData
      });
      
      const response = await fetch(`${SOCKET_SERVER_URL}/api/cyber-score/rate/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...ratingData,
          meetingId: roomId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(
          `${participant.userName} has been rated. Score: ${data.result.previousScore} → ${data.result.newScore}`,
          'success',
          6000
        );
        
        // Update the participant's cyber score in local state
        setPeers(prev => prev.map(p => 
          p.socketId === participantSocketId 
            ? { ...p, cyberScore: { ...p.cyberScore, currentScore: data.result.newScore, reputationLevel: data.result.reputationLevel } }
            : p
        ));
        
        console.log('Rating submitted successfully:', data.result);
      } else {
        throw new Error(data.message || 'Failed to submit rating');
      }
    } catch (error) {
      console.error('Error submitting rating:', error);
      showNotification(`Failed to submit rating: ${error.message}`, 'error');
    }
  }, [activePeers, roomId, showNotification]);
  
  const submitParticipantAward = useCallback(async (participantSocketId, awardData) => {
    try {
      // Find the participant by socketId
      const participant = activePeers.find(p => p.socketId === participantSocketId);
      if (!participant) {
        throw new Error('Participant not found');
      }
      
      // Use participant's userId, but fallback to socketId if not available
      const targetUserId = participant.userId || participant.socketId;
      
      if (!targetUserId) {
        throw new Error('Unable to identify participant for award');
      }
      
      console.log('Submitting award for participant:', {
        userName: participant.userName,
        userId: participant.userId,
        socketId: participant.socketId,
        targetUserId,
        awardData
      });
      
      const response = await fetch(`${SOCKET_SERVER_URL}/api/cyber-score/award/${targetUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...awardData,
          meetingId: roomId
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification(
          `🎉 ${participant.userName} has been awarded! Score: ${data.result.previousScore} → ${data.result.newScore} (+${data.result.pointsAwarded} pts)`,
          'success',
          6000
        );
        
        // Update the participant's cyber score in local state
        setPeers(prev => prev.map(p => 
          p.socketId === participantSocketId 
            ? { ...p, cyberScore: { ...p.cyberScore, currentScore: data.result.newScore, reputationLevel: data.result.reputationLevel } }
            : p
        ));
        
        console.log('Award submitted successfully:', data.result);
      } else {
        throw new Error(data.message || 'Failed to submit award');
      }
    } catch (error) {
      console.error('Error submitting award:', error);
      showNotification(`Failed to submit award: ${error.message}`, 'error');
    }
  }, [activePeers, roomId, showNotification]);
  
  const fetchCyberScores = useCallback(async (userIds) => {
    try {
      const response = await fetch(`${SOCKET_SERVER_URL}/api/cyber-score/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds })
      });
      
      const data = await response.json();
      if (data.success) {
        setCyberScores(data.cyberScores);
      }
    } catch (error) {
      console.error('Error fetching cyber scores:', error);
    }
  }, []);
  
  // Fetch cyber scores when participants change
  useEffect(() => {
    const userIds = activePeers.map(p => p.userId || p.socketId).filter(Boolean);
    if (userIds.length > 0) {
      fetchCyberScores(userIds);
    }
  }, [activePeers, fetchCyberScores]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Prevent shortcuts when typing
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      switch (event.key.toLowerCase()) {
        case 'm':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleAudio();
          }
          break;
        case 'v':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleVideo();
          }
          break;
        case 's':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            isScreenSharing ? stopScreenShare() : startScreenShare();
          }
          break;
        case 'r':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowReactions(!showReactions);
          }
          break;
        case 'c':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowChat(!showChat);
          }
          break;
        case 'p':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setShowParticipants(!showParticipants);
          }
          break;
        case 'g':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker');
          }
          break;
        case 'h':
          if (!event.ctrlKey && !event.metaKey) {
            event.preventDefault();
            toggleHandRaise();
          }
          break;
        case 'escape':
          setShowChat(false);
          setShowParticipants(false);
          setShowReactions(false);
          setShowMoreOptions(false);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleAudio, toggleVideo, isScreenSharing, startScreenShare, stopScreenShare, 
      showReactions, showChat, showParticipants, viewMode, toggleHandRaise]);

  // Authentication check - moved after all hooks to comply with Rules of Hooks
  if (!userId && isAuthenticated === false) {
    return (
      <div className="meeting-error">
        <h2>Authentication Required</h2>
        <p>You must be logged in to join meetings.</p>
        <button onClick={() => navigate('/login')}>Login</button>
      </div>
    );
  }

  // Waiting room UI
  if (isInWaitingRoom && !isAdmitted) {
    return (
      <div className="live-meeting-container waiting-room">
        <div className="waiting-room-content">
          <div className="waiting-room-header">
            <h2>Waiting to join meeting</h2>
            <p>Room ID: {roomId}</p>
          </div>
          
          <div className="waiting-room-body">
            <div className="waiting-icon">
              <FaHourglassHalf className="hourglass-icon" />
            </div>
            
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
          </div>
          
          <div className="waiting-room-footer">
            <p>The host will be notified of your request to join.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="live-meeting-container">
      {/* Enhanced Top Bar */}
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
            <ConnectionQualityIndicator quality={connectionQuality} />
          </div>
        </div>
        
        <div className="topbar-right">
          <button 
            className="view-toggle-btn"
            onClick={() => setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker')}
            title={`Switch to ${viewMode === 'speaker' ? 'gallery' : 'speaker'} view`}
          >
            <FaTh />
            <span>{viewMode === 'speaker' ? 'Gallery' : 'Speaker'} View</span>
          </button>
          
          <div className="participants-count">
            <FaUsers />
            <span>{totalParticipants}</span>
          </div>
        </div>
      </div>

      {/* Enhanced Main Video Area */}
      <div className="meeting-content">
        <div className={`video-area ${viewMode}-view`}>
          {viewMode === 'speaker' ? (
            <div className="speaker-layout">
              <div className="main-video-container">
                {isScreenSharing ? (
                  // When screen sharing, show screen share as main video
                  <>
                    <video 
                      ref={screenShareVideo} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="main-video screen-share-main"
                    />
                    <div className="video-overlay">
                      <div className="participant-name">
                        {userName} (You) - Screen Share
                        {isHost && <FaCrown className="host-badge" />}
                        {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                        {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                        <FaDesktop className="screen-share-icon" />
                      </div>
                    </div>
                    
                    {/* Camera picture-in-picture when screen sharing */}
                    <div className="camera-pip">
                      <video 
                        ref={userVideo} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="pip-video"
                      />
                      <div className="pip-overlay">
                        <span className="pip-label">You</span>
                        {!isVideoOn && <div className="video-disabled-overlay">Camera Off</div>}
                      </div>
                    </div>
                  </>
                ) : (
                  // Normal camera view when not screen sharing
                  <>
                    <video 
                      ref={userVideo} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="main-video"
                    />
                    <div className="video-overlay">
                      <div className="participant-name">
                        {userName} (You) - Camera
                        {isHost && <FaCrown className="host-badge" />}
                        {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                        {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              {activePeers.length > 0 && (
                <div className="participants-strip">
                  {activePeers.map((peer, index) => (
                    <EnhancedVideoTile 
                      key={peer.socketId || index} 
                      peer={peer.peer} 
                      userName={peer.userName}
                      isSmall={true}
                      isAudioOn={peer.isAudioOn}
                      isVideoOn={peer.isVideoOn}
                      isHandRaised={peer.isHandRaised}
                      isScreenSharing={peer.isScreenSharing}
                      hasCamera={peer.hasCamera !== false}
                      isHost={peer.isHost}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="gallery-layout">
              <div className="video-grid">
                {isScreenSharing ? (
                  // Show both camera and screen share in gallery when screen sharing
                  <>
                    <div className="video-tile screen-share-tile">
                      <video 
                        ref={screenShareVideo} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="participant-video screen-share-video"
                      />
                      <div className="video-overlay">
                        <div className="participant-name">
                          {userName} (You) - Screen Share
                          {isHost && <FaCrown className="host-badge" />}
                          {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                          {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                          <FaDesktop className="screen-share-icon" />
                        </div>
                      </div>
                    </div>
                    
                    <div className="video-tile camera-tile">
                      <video 
                        ref={userVideo} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="participant-video camera-video"
                      />
                      <div className="video-overlay">
                        <div className="participant-name">
                          {userName} (You) - Camera
                          {isHost && <FaCrown className="host-badge" />}
                          {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                          {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                        </div>
                        {!isVideoOn && <div className="video-disabled-overlay">Camera Off</div>}
                      </div>
                    </div>
                  </>
                ) : (
                  // Normal camera view when not screen sharing
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
                        {userName} (You) - Camera
                        {isHost && <FaCrown className="host-badge" />}
                        {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                        {isHandRaised && <FaHandPaper className="hand-raised-icon" />}
                      </div>
                    </div>
                  </div>
                )}
                
                {activePeers.map((peer, index) => (
                  <EnhancedVideoTile 
                    key={peer.socketId || index} 
                    peer={peer.peer} 
                    userName={peer.userName}
                    isAudioOn={peer.isAudioOn}
                    isVideoOn={peer.isVideoOn}
                    isHandRaised={peer.isHandRaised}
                    isScreenSharing={peer.isScreenSharing}
                    hasCamera={peer.hasCamera !== false}
                    isHost={peer.isHost}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Reactions Overlay */}
        {activeEmojis.length > 0 && (
          <div className="reactions-overlay">
            {activeEmojis.map((emojiData) => (
              <FloatingReaction
                key={emojiData.id}
                emoji={emojiData.emoji}
                sender={emojiData.userName}
                position={emojiData.position}
                onComplete={() => handleReactionComplete(emojiData.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Controls Bar */}
      <div className="meeting-controls">
        <div className="controls-left">
          <div className="control-group">
            <button 
              className={`control-btn ${!isAudioOn ? 'danger' : 'primary'}`}
              onClick={toggleAudio}
              title={`${isAudioOn ? 'Mute' : 'Unmute'} (M)`}
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
              title={`${isVideoOn ? 'Stop' : 'Start'} Video (V)`}
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
          {supportsScreenShare && (
            <div className="control-group">
              <button 
                className={`control-btn secondary ${isScreenSharing ? 'active' : ''}`}
                onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                title={`${isScreenSharing ? 'Stop' : 'Start'} Screen Share (S)`}
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
            className={`control-btn secondary ${showParticipants ? 'active' : ''}`}
            onClick={() => setShowParticipants(!showParticipants)}
            title="Participants (P)"
          >
            <FaUsers />
            <span>Participants</span>
          </button>

          <button 
            className={`control-btn secondary ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Chat (C)"
          >
            <FaComment />
            <span>Chat</span>
          </button>

          <button 
            className={`control-btn secondary ${showReactions ? 'active' : ''}`}
            onClick={() => setShowReactions(!showReactions)}
            title="Reactions (R)"
          >
            <FaSmile />
            <span>Reactions</span>
          </button>

          <button 
            className={`control-btn secondary ${isHandRaised ? 'active' : ''}`}
            onClick={toggleHandRaise}
            title={`${isHandRaised ? 'Lower' : 'Raise'} Hand (H)`}
          >
            <FaHandPaper />
            <span>{isHandRaised ? 'Lower Hand' : 'Raise Hand'}</span>
          </button>

          <button 
            className={`control-btn secondary ${showMoreOptions ? 'active' : ''}`}
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            title="More Options"
          >
            <FaEllipsisH />
            <span>More</span>
          </button>
        </div>

        <div className="controls-right">
          <button 
            className="control-btn danger end-btn"
            onClick={endCall}
            title="End Meeting"
          >
            <FaPhone />
            <span>End Meeting</span>
          </button>
        </div>
      </div>

      {/* Enhanced Reactions Panel */}
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
            <button onClick={() => sendEmoji('👍')} title="Thumbs Up">
              <span>👍</span>
              <span>Thumbs Up</span>
            </button>
            <button onClick={() => sendEmoji('❤️')} title="Heart">
              <span>❤️</span>
              <span>Heart</span>
            </button>
            <button onClick={() => sendEmoji('😂')} title="Laugh">
              <span>😂</span>
              <span>Laugh</span>
            </button>
            <button onClick={() => sendEmoji('😢')} title="Sad">
              <span>😢</span>
              <span>Sad</span>
            </button>
            <button onClick={() => sendEmoji('👏')} title="Clap">
              <span>👏</span>
              <span>Clap</span>
            </button>
            <button onClick={() => sendEmoji('🎉')} title="Celebrate">
              <span>🎉</span>
              <span>Celebrate</span>
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
        </div>
      )}

      {/* Enhanced Chat Panel */}
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
            {chatMessages.map((msg) => (
              <div key={msg.id} className="chat-message">
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
                maxLength={500}
              />
              <label className="file-input-btn">
                <FaFile />
                <input 
                  type="file" 
                  onChange={(e) => {
                    // File sending logic would go here
                    console.log('File selected:', e.target.files[0]);
                  }}
                  style={{display: 'none'}}
                />
              </label>
              <button 
                className="send-btn" 
                onClick={sendMessage}
                disabled={!message.trim()}
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Participants Panel */}
      {showParticipants && (
        <div className="participants-panel">
          <div className="panel-header">
            <h3>Participants ({totalParticipants})</h3>
            <button 
              className="close-btn"
              onClick={() => setShowParticipants(false)}
            >
              <FaTimes />
            </button>
          </div>
          
          {isHost && (
            <div className="host-controls">
              <button 
                className="host-control-btn"
                onClick={muteAllParticipants}
                disabled={activePeers.length === 0}
                title={`Mute all ${activePeers.length} participants`}
              >
                <FaMicrophoneSlash /> Mute All ({activePeers.length})
              </button>
              <button 
                className="host-control-btn"
                onClick={disableAllVideos}
                disabled={activePeers.length === 0}
                title={`Stop all ${activePeers.length} participants' videos`}
              >
                <FaVideoSlash /> Stop All Video ({activePeers.length})
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
            
            {activePeers.map((peer, index) => {
              const userScore = cyberScores[peer.userId || peer.socketId] || peer.cyberScore || { currentScore: 85, reputationLevel: 'good' };
              return (
                <div key={peer.socketId || index} className="participant-item">
                  <div className="participant-info">
                    <span className="participant-name">
                      {peer.userName}
                      {peer.isHost && <FaCrown className="host-badge" />}
                    </span>
                    <div className="participant-status">
                      {peer.isAudioOn === false && <FaMicrophoneSlash className="status-muted" />}
                      {peer.isVideoOn === false && <FaVideoSlash className="status-video-off" />}
                      {peer.isHandRaised && <FaHandPaper className="status-hand-raised" />}
                      {peer.isScreenSharing && <FaDesktop className="status-screen-sharing" />}
                    </div>
                    <div className="participant-cyber-score">
                      <CyberScoreBadge 
                        score={userScore.currentScore}
                        reputationLevel={userScore.reputationLevel}
                        size="mini"
                        showLabel={false}
                        isRestricted={userScore.isRestricted}
                        totalMeetings={userScore.totalMeetings}
                      />
                    </div>
                  </div>
                  {isHost && (
                    <div className="participant-controls">
                      <button 
                        title="Award participant" 
                        className="participant-control-btn award-btn"
                        onClick={() => openAwardModal({...peer, cyberScore: userScore})}
                      >
                        <FaStar />
                      </button>
                      <button 
                        title="Rate participant behavior" 
                        className="participant-control-btn rate-btn"
                        onClick={() => openRatingModal({...peer, cyberScore: userScore})}
                      >
                        <FaExclamationTriangle />
                      </button>
                      <button 
                        title="Mute participant" 
                        className="participant-control-btn mute-btn"
                        onClick={() => muteParticipant(peer.socketId, peer.userName)}
                      >
                        <FaMicrophoneSlash />
                      </button>
                      <button 
                        title="Stop participant video" 
                        className="participant-control-btn video-btn"
                        onClick={() => disableParticipantVideo(peer.socketId, peer.userName)}
                      >
                        <FaVideoSlash />
                      </button>
                      <button 
                        title="Remove participant" 
                        className="participant-control-btn remove-btn"
                        onClick={() => removeParticipant(peer.socketId, peer.userName)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Waiting Room Section for Hosts */}
          {isHost && waitingParticipants.length > 0 && (
            <div className="waiting-room-section">
              <h4>Waiting Room ({waitingParticipants.length})</h4>
              <div className="waiting-participants-list">
                {waitingParticipants.map((participant) => {
                  const waitingScore = participant.cyberScore || { currentScore: 85, reputationLevel: 'good' };
                  return (
                    <div key={participant.socketId} className="waiting-participant-item">
                      <div className="participant-info">
                        <span className="participant-name">{participant.userName}</span>
                        <div className="participant-cyber-score">
                          <CyberScoreBadge 
                            score={waitingScore.currentScore}
                            reputationLevel={waitingScore.reputationLevel}
                            size="small"
                            showLabel={true}
                            isRestricted={waitingScore.isRestricted}
                            totalMeetings={waitingScore.totalMeetings}
                          />
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
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Host Rating Modal */}
      <HostRatingModal 
        isOpen={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setSelectedParticipantForRating(null);
        }}
        participant={selectedParticipantForRating}
        onSubmitRating={submitParticipantRating}
        currentUser={currentUser}
        meetingId={roomId}
      />
      
      {/* Host Award Modal */}
      <HostAwardModal 
        isOpen={showAwardModal}
        onClose={() => {
          setShowAwardModal(false);
          setSelectedParticipantForAward(null);
        }}
        participant={selectedParticipantForAward}
        onSubmitAward={submitParticipantAward}
        currentUser={currentUser}
        meetingId={roomId}
      />
      
      {/* Notifications Toast */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`notification toast ${notification.type}`}
              onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
            >
              <div className="notification-content">
                <span className="notification-message">{notification.message}</span>
                <button className="notification-close">
                  <FaTimes />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(EnhancedLiveMeeting);