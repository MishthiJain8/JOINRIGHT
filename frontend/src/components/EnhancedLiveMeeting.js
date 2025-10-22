import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import Peer from "simple-peer";
import { 
  FaMicrophone, 
  FaMicrophoneSlash, 
  FaVideo, 
  FaVideoSlash,
  FaDesktop,
  FaPhone,
  FaComment,
  FaCog,
  FaUsers,
  FaRecordVinyl,
  FaStop,
  FaPaperPlane,
  FaSmile,
  FaFile,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeDown,
  FaHandPaper,
  FaChevronUp,
  FaEllipsisH,
  FaShare,
  FaLock,
  FaCrown,
  FaUserPlus,
  FaTh,
  FaUserFriends,
  FaShieldAlt,
  FaClosedCaptioning,
  FaKeyboard,
  FaBroadcastTower,
  FaPause,
  FaPlay,
  FaVolumeOff,
  FaTimes,
  FaAngleRight,
  FaThumbsUp,
  FaHeart,
  FaLaugh,
  FaSurprise,
  FaSadTear,
  FaAngry,
  FaHands,
  FaCheck
} from 'react-icons/fa';
import './EnhancedLiveMeeting.css';
import { useUI } from '../contexts/UIContext';
import { IsolatedSocket, IsolatedPeer } from '../utils/sessionIsolation';

const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const EnhancedLiveMeeting = ({ 
  roomId: propRoomId, 
  userName: propUserName, 
  onClose,
  sessionManager,
  userContext
}) => {
  const { roomId: paramRoomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Use props if provided (for overlay mode), otherwise use route params
  const roomId = propRoomId || paramRoomId;
  const userName = propUserName || location.state?.userName || "Guest";
  const { enterImmersiveMode, exitImmersiveMode } = useUI();

  // Check if user accessed via proper join flow
  useEffect(() => {
    // Check if user has valid meeting data from proper join flow
    const currentMeeting = localStorage.getItem('currentMeeting');
    const hasValidState = location.state && location.state.meetingData;
    
    if (!propRoomId && !currentMeeting && !hasValidState) {
      // User tried to access meeting directly without proper join flow
      console.warn('Direct access to meeting denied - redirecting to join page');
      navigate('/join', { replace: true });
      return;
    }
  }, [navigate, location.state, propRoomId]);

  // Refs
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const screenShareRef = useRef();
  const mediaRecorderRef = useRef(null);
  const chatContainerRef = useRef();

  // State
  const [peers, setPeers] = useState([]);
  const [userStream, setUserStream] = useState();
  const [screenStream, setScreenStream] = useState();
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [showChat, setShowChat] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participantsList, setParticipantsList] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionQuality, setConnectionQuality] = useState('good');
  
  // Zoom-specific states
  const [viewMode, setViewMode] = useState('speaker'); // 'speaker' or 'gallery'
  const [isHandRaised, setIsHandRaised] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showBreakoutRooms, setShowBreakoutRooms] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [isMeetingLocked, setIsMeetingLocked] = useState(false);
  const [showSecurityOptions, setShowSecurityOptions] = useState(false);
  const [showCaptions, setShowCaptions] = useState(false);
  const [speakerView, setSpeakerView] = useState(null);
  const [pinnedParticipant, setPinnedParticipant] = useState(null);
  const [reactions, setReactions] = useState([]);
  const [waitingRoomParticipants, setWaitingRoomParticipants] = useState([]);
  const [recordingStatus, setRecordingStatus] = useState('stopped'); // 'recording', 'paused', 'stopped'
  const [isWaitingForHost, setIsWaitingForHost] = useState(false);
  const [meetingInfo, setMeetingInfo] = useState({});
  const [isVideoHD, setIsVideoHD] = useState(true);

  // Enter immersive mode when component mounts
  useEffect(() => {
    enterImmersiveMode();
    return () => {
      exitImmersiveMode();
    };
  }, [enterImmersiveMode, exitImmersiveMode]);

  // Keyboard shortcuts for better accessibility
  useEffect(() => {
    const handleKeyPress = (event) => {
      // Prevent shortcuts when typing in input fields
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
        case 'q':
          if (event.altKey) {
            event.preventDefault();
            endCall();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [toggleAudio, toggleVideo, isScreenSharing, startScreenShare, stopScreenShare, endCall]);

  // Helper function to safely signal to a peer
  const safePeerSignal = useCallback((peer, signal) => {
    try {
      if (peer && !peer.destroyed) {
        peer.signal(signal);
      }
    } catch (error) {
      console.warn('Error signaling to peer:', error.message);
    }
  }, []);

  // Helper function to safely destroy a peer
  const safePeerDestroy = useCallback((peer) => {
    try {
      if (peer && !peer.destroyed) {
        peer.destroy();
      }
    } catch (error) {
      console.warn('Error destroying peer:', error.message);
    }
  }, []);

  // Initialize connection with session isolation
  useEffect(() => {
    // Use isolated socket if sessionManager is available
    if (sessionManager && userContext) {
      const isolatedSocket = new IsolatedSocket(SOCKET_SERVER_URL, {
        transports: ['websocket'],
        upgrade: false
      });
      
      isolatedSocket.connect(propUserName || userName, roomId)
        .then((connectedSocket) => {
          socketRef.current = connectedSocket.socket;
          initializeSocketHandlers();
        })
        .catch((error) => {
          console.error('Failed to create isolated socket:', error);
          // Fallback to regular socket
          socketRef.current = io(SOCKET_SERVER_URL);
          initializeSocketHandlers();
        });
      
      console.log('Using isolated socket for session:', userContext.sessionId);
    } else {
      // Fallback to regular socket
      socketRef.current = io(SOCKET_SERVER_URL);
      initializeSocketHandlers();
    }
  }, [roomId, userName, sessionManager, userContext]);
  
  // Socket handlers initialization
  const initializeSocketHandlers = useCallback(() => {
    if (!socketRef.current) return;
    
    // Get user media with enhanced error handling
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 1280 }, 
        height: { ideal: 720 },
        facingMode: 'user'
      }, 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    .then((stream) => {
      // Add stream to session context
      if (sessionManager && userContext) {
        sessionManager.addStream(propUserName || userName, roomId, 'user-video', stream);
      }
      setUserStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      socketRef.current.emit("join-room", { 
        roomId, 
        userId: userName, 
        userName 
      });

      // Handle existing users with session isolation
      socketRef.current.on("existing-users", (users) => {
        const peers = users.map(user => {
          const peer = createPeerWithIsolation(user.socketId, socketRef.current.id, stream, user);
          peersRef.current.push({
            peerID: user.socketId,
            peer,
            userName: user.userName
          });
          return { peer, userName: user.userName, socketId: user.socketId };
        });
        setPeers(peers);
      });

      // Handle new user connection with session isolation
      socketRef.current.on("user-connected", (userInfo) => {
        const peer = addPeerWithIsolation(userInfo.socketId, stream, userInfo);
        peersRef.current.push({
          peerID: userInfo.socketId,
          peer,
          userName: userInfo.userName
        });
        setPeers(prev => [...prev, { 
          peer, 
          userName: userInfo.userName, 
          socketId: userInfo.socketId 
        }]);
        
        setParticipantsList(prev => [...prev, userInfo]);
      });

      // Handle WebRTC signaling with error protection
      socketRef.current.on("signal", ({ from, signal, userId }) => {
        const item = peersRef.current.find(p => p.peerID === from);
        if (item && item.peer) {
          safePeerSignal(item.peer, signal);
        }
      });

      // Handle user disconnection with proper cleanup
      socketRef.current.on("user-disconnected", ({ socketId }) => {
        const peerObj = peersRef.current.find(p => p.peerID === socketId);
        if (peerObj && peerObj.peer) {
          safePeerDestroy(peerObj.peer);
        }
        peersRef.current = peersRef.current.filter(p => p.peerID !== socketId);
        setPeers(prev => prev.filter(p => p.socketId !== socketId));
        setParticipantsList(prev => prev.filter(p => p.socketId !== socketId));
      });

      // Chat messages
      socketRef.current.on("chat-message", (data) => {
        setChatMessages(prev => [...prev, data]);
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      });

      // Typing indicators
      socketRef.current.on("user-typing", ({ userId, userName }) => {
        setTypingUsers(prev => [...prev.filter(u => u.userId !== userId), { userId, userName }]);
      });

      socketRef.current.on("user-stop-typing", ({ userId }) => {
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      });

      // Screen sharing events
      socketRef.current.on("user-screen-share", ({ userId, userName }) => {
        console.log(`${userName} started screen sharing`);
      });

      socketRef.current.on("user-stop-screen-share", ({ userId }) => {
        console.log(`User ${userId} stopped screen sharing`);
      });
    })
    .catch(err => {
      console.error("Error accessing media devices:", err);
      alert("Error accessing camera/microphone. Please check permissions.");
    });

    return () => {
      // Cleanup function with proper error handling
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      // Clean up all peers
      peersRef.current.forEach(({ peer }) => {
        safePeerDestroy(peer);
      });
      
      // Stop all media streams
      if (userStream) {
        userStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping track:', error);
          }
        });
      }
      
      if (screenStream) {
        screenStream.getTracks().forEach(track => {
          try {
            track.stop();
          } catch (error) {
            console.warn('Error stopping screen share track:', error);
          }
        });
      }
    };
  }, [roomId, userName, safePeerSignal, safePeerDestroy]);

  const createPeer = useCallback((userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      if (socketRef.current) {
        socketRef.current.emit("signal", {
          to: userToSignal,
          from: callerID,
          signal,
        });
      }
    });

    // Add error handling for peer connection
    peer.on("error", (error) => {
      console.warn('Peer error:', error);
    });

    return peer;
  }, []);
  
  // Isolated peer creation with session management
  const createPeerWithIsolation = useCallback((userToSignal, callerID, stream, userInfo) => {
    if (sessionManager && userContext) {
      console.log('Creating isolated peer for user:', userInfo.userName);
    }
    // For now, use regular peer creation until isolated peers are fully implemented
    return createPeer(userToSignal, callerID, stream);
  }, [createPeer, sessionManager, userContext]);

  const addPeer = useCallback((incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      if (socketRef.current) {
        socketRef.current.emit("signal", {
          to: callerID,
          from: socketRef.current.id,
          signal,
        });
      }
    });

    // Add error handling for peer connection
    peer.on("error", (error) => {
      console.warn('Peer error:', error);
    });

    safePeerSignal(peer, incomingSignal);
    return peer;
  }, [safePeerSignal]);
  
  // Isolated peer addition with session management
  const addPeerWithIsolation = useCallback((callerID, stream, userInfo) => {
    if (sessionManager && userContext) {
      console.log('Adding isolated peer for user:', userInfo.userName);
    }
    // For now, use regular peer addition until isolated peers are fully implemented
    return addPeer(null, callerID, stream);
  }, [addPeer, sessionManager, userContext]);

  // Media controls with error handling
  const toggleVideo = () => {
    if (userStream) {
      try {
        const videoTrack = userStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.enabled = !isVideoOn;
          setIsVideoOn(!isVideoOn);
          if (socketRef.current) {
            socketRef.current.emit("toggle-video", !isVideoOn);
          }
        }
      } catch (error) {
        console.error('Error toggling video:', error);
      }
    }
  };

  const toggleAudio = () => {
    if (userStream) {
      try {
        const audioTrack = userStream.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !isAudioOn;
          setIsAudioOn(!isAudioOn);
          if (socketRef.current) {
            socketRef.current.emit("toggle-audio", !isAudioOn);
          }
        }
      } catch (error) {
        console.error('Error toggling audio:', error);
      }
    }
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      setScreenStream(stream);
      setIsScreenSharing(true);
      
      // Replace video track in all peer connections with error handling
      peersRef.current.forEach(({ peer }) => {
        if (peer && !peer.destroyed) {
          try {
            const videoTrack = stream.getVideoTracks()[0];
            if (peer.streams && peer.streams[0]) {
              const sender = peer.streams[0].getVideoTracks()[0];
              if (peer.replaceTrack && sender && videoTrack) {
                peer.replaceTrack(sender, videoTrack, userStream);
              }
            }
          } catch (error) {
            console.warn('Error replacing track for screen share:', error);
          }
        }
      });

      if (socketRef.current) {
        socketRef.current.emit("start-screen-share");
      }

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = () => {
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
    
    // Replace back to camera with error handling
    if (userStream) {
      peersRef.current.forEach(({ peer }) => {
        if (peer && !peer.destroyed) {
          try {
            const videoTrack = userStream.getVideoTracks()[0];
            if (peer.streams && peer.streams[0]) {
              const sender = peer.streams[0].getVideoTracks()[0];
              if (peer.replaceTrack && sender && videoTrack) {
                peer.replaceTrack(sender, videoTrack, userStream);
              }
            }
          } catch (error) {
            console.warn('Error replacing track back to camera:', error);
          }
        }
      });
    }

    if (socketRef.current) {
      socketRef.current.emit("stop-screen-share");
    }
  };

  // Recording functions with error handling
  const startRecording = () => {
    if (userStream) {
      try {
        const mediaRecorder = new MediaRecorder(userStream, {
          mimeType: 'video/webm;codecs=vp9'
        });
        
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            setRecordedChunks(prev => [...prev, event.data]);
          }
        };

        mediaRecorder.start(1000);
        mediaRecorderRef.current = mediaRecorder;
        setIsRecording(true);
      } catch (error) {
        console.error('Error starting recording:', error);
        alert('Recording not supported in this browser');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(recordedChunks, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `meeting-${roomId}-${Date.now()}.webm`;
          a.click();
          
          // Save to backend
          const formData = new FormData();
          formData.append('file', blob, `meeting-${roomId}-${Date.now()}.webm`);
          formData.append('uploadType', 'recording');
          
          fetch(`${SOCKET_SERVER_URL}/api/files/upload`, {
            method: 'POST',
            body: formData
          }).catch(error => {
            console.warn('Error uploading recording:', error);
          });

          setRecordedChunks([]);
        };
        setIsRecording(false);
      } catch (error) {
        console.error('Error stopping recording:', error);
      }
    }
  };

  // Chat functions
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
    if (socketRef.current) {
      socketRef.current.emit("typing-start");
      
      // Stop typing after 2 seconds of no input
      setTimeout(() => {
        if (socketRef.current) {
          socketRef.current.emit("typing-stop");
        }
      }, 2000);
    }
  };

  const sendFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
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
        
        if (socketRef.current) {
          socketRef.current.emit("chat-message", messageData);
        }
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file');
    }
  };

  // Zoom-specific functions
  const toggleHandRaise = () => {
    setIsHandRaised(!isHandRaised);
    if (socketRef.current) {
      socketRef.current.emit('hand-raise-toggle', !isHandRaised);
    }
  };

  const sendReaction = (reactionType) => {
    const reaction = {
      id: Date.now(),
      type: reactionType,
      user: userName,
      timestamp: Date.now()
    };
    
    setReactions(prev => [...prev, reaction]);
    if (socketRef.current) {
      socketRef.current.emit('send-reaction', reaction);
    }
    
    // Remove reaction after 3 seconds
    setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== reaction.id));
    }, 3000);
    
    setShowReactions(false);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'speaker' ? 'gallery' : 'speaker');
  };

  const admitFromWaitingRoom = (participantId) => {
    if (socketRef.current) {
      socketRef.current.emit('admit-participant', participantId);
    }
    setWaitingRoomParticipants(prev => prev.filter(p => p.id !== participantId));
  };

  const toggleMeetingLock = () => {
    setIsMeetingLocked(!isMeetingLocked);
    if (socketRef.current) {
      socketRef.current.emit('toggle-meeting-lock', !isMeetingLocked);
    }
  };

  const startBreakoutRooms = () => {
    setShowBreakoutRooms(true);
    // Implementation for breakout rooms
  };

  const muteAll = () => {
    if (socketRef.current) {
      socketRef.current.emit('mute-all');
    }
  };

  const stopAllVideo = () => {
    if (socketRef.current) {
      socketRef.current.emit('stop-all-video');
    }
  };

  const toggleCaptions = () => {
    setShowCaptions(!showCaptions);
  };

  const copyInviteLink = () => {
    const inviteText = `Join my meeting\n${window.location.href}\nMeeting ID: ${roomId}`;
    navigator.clipboard.writeText(inviteText);
    // Show toast notification
  };

  const endCall = () => {
    // Clean up before leaving
    peersRef.current.forEach(({ peer }) => {
      safePeerDestroy(peer);
    });
    
    if (userStream) {
      userStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch (error) {
          console.warn('Error stopping track:', error);
        }
      });
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Clear meeting data
    localStorage.removeItem('currentMeeting');
    
    if (onClose) {
      onClose();
    } else {
      navigate('/dashboard');
    }
  };

  // Continue with the rest of your JSX render logic here...
  // The render part would remain largely the same, just make sure all the functions
  // are called properly and with error handling

  return (
    <div className="zoom-meeting-container">
      {/* Zoom Top Bar */}
      <div className="zoom-topbar">
        <div className="zoom-topbar-left">
          <div className="meeting-info">
            <div className="meeting-title">Meeting Room: {roomId}</div>
            {isHost && <FaCrown className="host-icon" />}
            {isMeetingLocked && <FaLock className="lock-icon" />}
          </div>
          {recordingStatus === 'recording' && (
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span>Recording</span>
            </div>
          )}
        </div>
        
        <div className="zoom-topbar-center">
          <div className="connection-status">
            <div className={`signal-bars ${connectionQuality}`}>
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
        
        <div className="zoom-topbar-right">
          <button 
            className="topbar-btn view-toggle"
            onClick={toggleViewMode}
            title={viewMode === 'speaker' ? 'Gallery View' : 'Speaker View'}
          >
            {viewMode === 'speaker' ? <FaTh /> : <FaUserFriends />}
            <span>{viewMode === 'speaker' ? 'Gallery View' : 'Speaker View'}</span>
          </button>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="zoom-main-content">
        <div className={`video-area ${viewMode}-view`}>
          {/* Speaker View */}
          {viewMode === 'speaker' && (
            <div className="speaker-view">
              <div className="main-speaker">
                {speakerView ? (
                  <Video 
                    peer={speakerView.peer} 
                    userName={speakerView.userName}
                    isMainSpeaker={true}
                  />
                ) : (
                  <div className="main-video-container">
                    <video 
                      ref={userVideo} 
                      autoPlay 
                      playsInline 
                      muted 
                      className="main-video"
                    />
                    <div className="video-controls-overlay">
                      <div className="participant-name">
                        {userName} (You)
                        {!isAudioOn && <FaMicrophoneSlash className="muted-icon" />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Participant Strip */}
              <div className="participants-strip">
                {peers.slice(0, 6).map((peer, index) => (
                  <div key={index} className="participant-tile-small">
                    <Video 
                      peer={peer.peer} 
                      userName={peer.userName}
                      isSmall={true}
                    />
                  </div>
                ))}
                {peers.length > 6 && (
                  <div className="more-participants">
                    +{peers.length - 6}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Gallery View */}
          {viewMode === 'gallery' && (
            <div className="gallery-view">
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
                    </div>
                  </div>
                </div>
                
                {peers.map((peer, index) => (
                  <div key={index} className="video-tile">
                    <Video 
                      peer={peer.peer} 
                      userName={peer.userName}
                      isGallery={true}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Reactions Overlay */}
        {reactions.length > 0 && (
          <div className="reactions-overlay">
            {reactions.map((reaction) => (
              <div key={reaction.id} className={`reaction reaction-${reaction.type}`}>
                {getReactionEmoji(reaction.type)}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modern Controls Bar */}
      <div className="zoom-controls">
        {/* Left Controls: Primary Actions */}
        <div className="controls-left">
          <div className="control-group">
            <button 
              className={`zoom-btn ${!isAudioOn ? 'danger' : 'primary'}`}
              onClick={toggleAudio}
              title={isAudioOn ? 'Mute microphone (M)' : 'Unmute microphone (M)'}
              aria-label={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
              aria-pressed={!isAudioOn}
              tabIndex={0}
            >
              {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
              <span>{isAudioOn ? 'Mute' : 'Unmute'}</span>
            </button>
            <button className="zoom-btn-dropdown" onClick={() => {}} title="Audio settings">
              <FaChevronUp />
            </button>
          </div>

          <div className="control-group">
            <button 
              className={`zoom-btn ${!isVideoOn ? 'danger' : 'primary'}`}
              onClick={toggleVideo}
              title={isVideoOn ? 'Stop video (V)' : 'Start video (V)'}
              aria-label={isVideoOn ? 'Stop video' : 'Start video'}
              aria-pressed={!isVideoOn}
              tabIndex={0}
            >
              {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
              <span>{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
            </button>
            <button className="zoom-btn-dropdown" onClick={() => {}} title="Video settings">
              <FaChevronUp />
            </button>
          </div>
        </div>

        {/* Center Controls: Meeting Features */}
        <div className="controls-center">
          {isHost && (
            <button 
              className="zoom-btn secondary"
              onClick={() => setShowSecurityOptions(!showSecurityOptions)}
              title="Security settings"
            >
              <FaShieldAlt />
              <span>Security</span>
            </button>
          )}

          <button 
            className={`zoom-btn secondary ${showParticipants ? 'active' : ''}`}
            onClick={() => setShowParticipants(!showParticipants)}
            title="View participants panel"
            aria-label={`${showParticipants ? 'Hide' : 'Show'} participants panel`}
            aria-expanded={showParticipants}
            tabIndex={0}
          >
            <FaUsers />
            <span>Participants</span>
          </button>

          <button 
            className={`zoom-btn secondary ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Open chat"
          >
            <FaComment />
            <span>Chat</span>
          </button>

          <div className="control-group">
            <button 
              className={`zoom-btn secondary ${isScreenSharing ? 'active' : ''}`}
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              title={isScreenSharing ? 'Stop sharing screen (S)' : 'Share screen (S)'}
              aria-label={isScreenSharing ? 'Stop sharing screen' : 'Share screen'}
              aria-pressed={isScreenSharing}
              tabIndex={0}
            >
              <FaDesktop />
              <span>{isScreenSharing ? 'Stop Share' : 'Share'}</span>
            </button>
            <button className="zoom-btn-dropdown" onClick={() => {}} title="Share options">
              <FaChevronUp />
            </button>
          </div>

          <div className="control-group">
            <button 
              className={`zoom-btn secondary ${recordingStatus === 'recording' ? 'active' : ''}`}
              onClick={recordingStatus === 'recording' ? stopRecording : startRecording}
              title={recordingStatus === 'recording' ? 'Stop recording' : 'Start recording'}
            >
              {recordingStatus === 'recording' ? <FaStop /> : <FaRecordVinyl />}
              <span>{recordingStatus === 'recording' ? 'Stop' : 'Record'}</span>
            </button>
            <button className="zoom-btn-dropdown" onClick={() => {}} title="Recording options">
              <FaChevronUp />
            </button>
          </div>

          <button 
            className={`zoom-btn secondary ${showReactions ? 'active' : ''}`}
            onClick={() => setShowReactions(!showReactions)}
            title="Show reactions"
          >
            <FaSmile />
            <span>Reactions</span>
          </button>

          <button 
            className={`zoom-btn secondary ${showMoreOptions ? 'active' : ''}`}
            onClick={() => setShowMoreOptions(!showMoreOptions)}
            title="More options"
          >
            <FaEllipsisH />
            <span>More</span>
          </button>
        </div>

        {/* Right Controls: End Meeting */}
        <div className="controls-right">
          <button 
            className="zoom-btn danger end-meeting" 
            onClick={endCall}
            title="End meeting for all participants (Alt+Q)"
            aria-label="End meeting for all participants"
            role="button"
            tabIndex={0}
          >
            <span>End Meeting</span>
          </button>
        </div>
      </div>

      {/* Reactions Panel */}
      {showReactions && (
        <div className="reactions-panel">
          <div className="reactions-grid">
            <button onClick={() => sendReaction('thumbsup')}>
              <FaThumbsUp /> <span>👍</span>
            </button>
            <button onClick={() => sendReaction('clap')}>
              <FaHands /> <span>👏</span>
            </button>
            <button onClick={() => sendReaction('heart')}>
              <FaHeart /> <span>❤️</span>
            </button>
            <button onClick={() => sendReaction('laugh')}>
              <FaLaugh /> <span>😂</span>
            </button>
            <button onClick={() => sendReaction('surprise')}>
              <FaSurprise /> <span>😮</span>
            </button>
            <button onClick={() => sendReaction('sad')}>
              <FaSadTear /> <span>😢</span>
            </button>
          </div>
          <div className="raise-hand-section">
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
              className="close-panel"
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
              <button className="host-control-btn" onClick={() => {}}>
                <FaVideo /> Ask to Start Video
              </button>
            </div>
          )}
          
          <div className="participants-list">
            <div className="participant-item">
              <div className="participant-info">
                <span className="participant-name">
                  {userName} (You) {isHost && <FaCrown className="host-badge" />}
                </span>
                <div className="participant-status">
                  {!isAudioOn && <FaMicrophoneSlash className="status-icon muted" />}
                  {!isVideoOn && <FaVideoSlash className="status-icon video-off" />}
                  {isHandRaised && <FaHandPaper className="status-icon hand-raised" />}
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
                    <button title="Mute">
                      <FaMicrophoneSlash />
                    </button>
                    <button title="Stop Video">
                      <FaVideoSlash />
                    </button>
                    <button title="More">
                      <FaEllipsisH />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {waitingRoomParticipants.length > 0 && (
            <div className="waiting-room-section">
              <h4>Waiting Room ({waitingRoomParticipants.length})</h4>
              {waitingRoomParticipants.map((participant) => (
                <div key={participant.id} className="waiting-participant">
                  <span>{participant.name}</span>
                  <button 
                    className="admit-btn"
                    onClick={() => admitFromWaitingRoom(participant.id)}
                  >
                    Admit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Panel */}
      {showChat && (
        <div className="chat-panel zoom-chat">
          <div className="panel-header">
            <h3>Chat</h3>
            <button 
              className="close-panel"
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
                {typingUsers.length === 1 ? 'is' : 'are'} typing...
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
                placeholder="Type message here..."
                className="chat-input"
              />
              <button className="send-btn" onClick={sendMessage}>
                <FaPaperPlane />
              </button>
            </div>
            <div className="chat-options">
              <label className="file-input-label">
                <FaFile />
                <input 
                  type="file" 
                  onChange={(e) => e.target.files[0] && sendFile(e.target.files[0])}
                  style={{display: 'none'}}
                />
              </label>
              <button onClick={() => {}}>Everyone</button>
            </div>
          </div>
        </div>
      )}

      {/* More Options Menu */}
      {showMoreOptions && (
        <div className="more-options-menu">
          <div className="options-section">
            <button className="option-item">
              <FaUserPlus /> <span>Invite</span>
            </button>
            <button className="option-item" onClick={toggleCaptions}>
              <FaClosedCaptioning /> <span>Captions</span>
            </button>
            <button className="option-item">
              <FaCog /> <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Security Options Menu */}
      {showSecurityOptions && isHost && (
        <div className="security-menu">
          <div className="security-header">
            <h4>Security</h4>
          </div>
          <div className="security-options">
            <label className="security-option">
              <input 
                type="checkbox" 
                checked={isMeetingLocked}
                onChange={toggleMeetingLock}
              />
              <span>Lock Meeting</span>
            </label>
            <label className="security-option">
              <input type="checkbox" />
              <span>Enable Waiting Room</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get reaction emoji
const getReactionEmoji = (type) => {
  const emojis = {
    thumbsup: '👍',
    clap: '👏',
    heart: '❤️',
    laugh: '😂',
    surprise: '😮',
    sad: '😢'
  };
  return emojis[type] || '😊';
};

// Video component for peer streams
const Video = ({ peer, userName, isMainSpeaker, isSmall, isGallery }) => {
  const ref = useRef();

  useEffect(() => {
    if (peer) {
      peer.on("stream", stream => {
        if (ref.current) {
          ref.current.srcObject = stream;
        }
      });

      peer.on("error", (error) => {
        console.warn('Video peer error:', error);
      });
    }
  }, [peer]);

  const videoClassName = isMainSpeaker ? 'main-video' : 
                        isSmall ? 'small-video' :
                        isGallery ? 'participant-video' : 'peer-video';

  return (
    <div className={`video-container ${isMainSpeaker ? 'main-speaker' : ''} ${isSmall ? 'small-tile' : ''}`}>
      <video ref={ref} autoPlay playsInline className={videoClassName} />
      <div className="video-overlay">
        <div className="participant-name">
          {userName}
          {/* Add status indicators here based on peer state */}
        </div>
      </div>
    </div>
  );
};

export default EnhancedLiveMeeting;