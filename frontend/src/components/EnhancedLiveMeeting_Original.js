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
  FaVolumeDown
} from 'react-icons/fa';
import './EnhancedLiveMeeting.css';
import { useUI } from '../contexts/UIContext';

const SOCKET_SERVER_URL = "http://localhost:5000";

const EnhancedLiveMeeting = ({ roomId: propRoomId, userName: propUserName, onClose }) => {
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

  // Enter immersive mode when component mounts
  useEffect(() => {
    enterImmersiveMode();
    return () => {
      exitImmersiveMode();
    };
  }, [enterImmersiveMode, exitImmersiveMode]);

  // Initialize connection and get user media
  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);
    
    navigator.mediaDevices.getUserMedia({ 
      video: { width: 1280, height: 720 }, 
      audio: true 
    })
    .then((stream) => {
      setUserStream(stream);
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }

      socketRef.current.emit("join-room", { 
        roomId, 
        userId: userName, 
        userName 
      });

      // Handle existing users
      socketRef.current.on("existing-users", (users) => {
        const peers = users.map(user => {
          const peer = createPeer(user.socketId, socketRef.current.id, stream);
          peersRef.current.push({
            peerID: user.socketId,
            peer,
            userName: user.userName
          });
          return { peer, userName: user.userName, socketId: user.socketId };
        });
        setPeers(peers);
      });

      // Handle new user connection
      socketRef.current.on("user-connected", (userInfo) => {
        const peer = addPeer(userInfo.socketId, stream);
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

      // Handle WebRTC signaling
      socketRef.current.on("signal", ({ from, signal, userId }) => {
        const item = peersRef.current.find(p => p.peerID === from);
        if (item) {
          item.peer.signal(signal);
        }
      });

      // Handle user disconnection
      socketRef.current.on("user-disconnected", ({ socketId }) => {
        const peerObj = peersRef.current.find(p => p.peerID === socketId);
        if (peerObj) {
          peerObj.peer.destroy();
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
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (userStream) {
        userStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [roomId, userName]);

  const createPeer = useCallback((userToSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current.emit("signal", {
        to: userToSignal,
        from: callerID,
        signal,
      });
    });

    return peer;
  }, []);

  const addPeer = useCallback((incomingSignal, callerID, stream) => {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socketRef.current.emit("signal", {
        to: callerID,
        from: socketRef.current.id,
        signal,
      });
    });

    peer.signal(incomingSignal);
    return peer;
  }, []);

  // Media controls
  const toggleVideo = () => {
    if (userStream) {
      const videoTrack = userStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoOn;
        setIsVideoOn(!isVideoOn);
        socketRef.current.emit("toggle-video", !isVideoOn);
      }
    }
  };

  const toggleAudio = () => {
    if (userStream) {
      const audioTrack = userStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioOn;
        setIsAudioOn(!isAudioOn);
        socketRef.current.emit("toggle-audio", !isAudioOn);
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
      
      // Replace video track in all peer connections
      peersRef.current.forEach(({ peer }) => {
        const videoTrack = stream.getVideoTracks()[0];
        const sender = peer.streams[0].getVideoTracks()[0];
        peer.replaceTrack(sender, videoTrack, userStream);
      });

      socketRef.current.emit("start-screen-share");

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error("Error starting screen share:", error);
    }
  };

  const stopScreenShare = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    
    setIsScreenSharing(false);
    
    // Replace back to camera
    if (userStream) {
      peersRef.current.forEach(({ peer }) => {
        const videoTrack = userStream.getVideoTracks()[0];
        const sender = peer.streams[0].getVideoTracks()[0];
        peer.replaceTrack(sender, videoTrack, userStream);
      });
    }

    socketRef.current.emit("stop-screen-share");
  };

  // Recording functions
  const startRecording = () => {
    if (userStream) {
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
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
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
        
        fetch('http://localhost:5000/api/files/upload', {
          method: 'POST',
          body: formData
        });

        setRecordedChunks([]);
      };
      setIsRecording(false);
    }
  };

  // Chat functions
  const sendMessage = () => {
    if (message.trim()) {
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
    socketRef.current.emit("typing-start");
    
    // Stop typing after 2 seconds of no input
    setTimeout(() => {
      socketRef.current.emit("typing-stop");
    }, 2000);
  };

  const sendFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch('http://localhost:5000/api/files/upload', {
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
        
        socketRef.current.emit("chat-message", messageData);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const endCall = () => {
    if (userStream) {
      userStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Use onClose prop if available (overlay mode), otherwise navigate
    if (onClose) {
      onClose();
    } else {
      navigate('/dashboard');
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="enhanced-meeting">
      {/* Floating Back Button */}
      <div className="meeting-nav">
        <button 
          className="back-to-dashboard"
          onClick={() => onClose ? onClose() : navigate('/dashboard')}
          title="Back to Dashboard"
        >
          <span className="logo">🤝 JointRight</span>
          <span className="back-text">Dashboard</span>
        </button>
      </div>

      <div className="meeting-container">
        {/* Video Grid */}
        <div className={`video-grid ${showChat ? 'with-sidebar' : 'full-width'}`}>
          <div className="video-wrapper local-video">
            <video
              ref={userVideo}
              muted
              autoPlay
              playsInline
              className={`video ${!isVideoOn ? 'video-off' : ''}`}
            />
            <div className="video-overlay">
              <span className="participant-name">{userName} (You)</span>
              <div className="video-status">
                {!isVideoOn && <FaVideoSlash />}
                {!isAudioOn && <FaMicrophoneSlash />}
              </div>
            </div>
          </div>

          {peers.map(({ peer, userName: peerName, socketId }) => (
            <VideoComponent 
              key={socketId} 
              peer={peer} 
              userName={peerName}
            />
          ))}

          {peers.length === 0 && (
            <div className="waiting-message">
              <h3>Waiting for others to join...</h3>
              <p>Share the meeting ID: {roomId}</p>
            </div>
          )}
        </div>

        {/* Chat Sidebar */}
        {showChat && (
          <div className="chat-sidebar">
            <div className="chat-header">
              <h3>Chat</h3>
              <button onClick={() => setShowChat(false)}>×</button>
            </div>
            
            <div className="chat-messages" ref={chatContainerRef}>
              {chatMessages.map((msg, index) => (
                <div key={index} className={`message ${msg.sender === userName ? 'own-message' : ''}`}>
                  <div className="message-header">
                    <span className="sender">{msg.sender}</span>
                    <span className="time">{new Date(msg.time).toLocaleTimeString()}</span>
                  </div>
                  <div className="message-content">
                    {msg.type === 'file' ? (
                      <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                        <FaFile /> {msg.fileName}
                      </a>
                    ) : (
                      msg.message
                    )}
                  </div>
                </div>
              ))}
              
              {typingUsers.length > 0 && (
                <div className="typing-indicator">
                  {typingUsers.map(user => user.userName).join(', ')} 
                  {typingUsers.length === 1 ? ' is' : ' are'} typing...
                </div>
              )}
            </div>

            <div className="chat-input">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    sendMessage();
                  } else {
                    handleTyping();
                  }
                }}
                placeholder="Type a message..."
              />
              <input
                type="file"
                id="file-input"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    sendFile(file);
                  }
                }}
              />
              <button onClick={() => document.getElementById('file-input').click()}>
                <FaFile />
              </button>
              <button onClick={sendMessage}>
                <FaPaperPlane />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="control-bar">
        <div className="controls-left">
          <button 
            className={`control-btn ${isAudioOn ? 'active' : 'muted'}`}
            onClick={toggleAudio}
            title={isAudioOn ? 'Mute' : 'Unmute'}
          >
            {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
          </button>
          
          <button 
            className={`control-btn ${isVideoOn ? 'active' : 'muted'}`}
            onClick={toggleVideo}
            title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}
          >
            {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
          </button>
          
          <button 
            className={`control-btn ${isScreenSharing ? 'active' : ''}`}
            onClick={isScreenSharing ? stopScreenShare : startScreenShare}
            title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
          >
            <FaDesktop />
          </button>
          
          <button 
            className={`control-btn ${isRecording ? 'recording' : ''}`}
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? 'Stop recording' : 'Start recording'}
          >
            {isRecording ? <FaStop /> : <FaRecordVinyl />}
          </button>
        </div>

        <div className="controls-center">
          <span className="meeting-info">
            Meeting ID: {roomId} | {participantsList.length + 1} participants
          </span>
        </div>

        <div className="controls-right">
          <button 
            className="control-btn"
            onClick={() => setShowParticipants(!showParticipants)}
            title="Participants"
          >
            <FaUsers />
          </button>
          
          <button 
            className={`control-btn ${showChat ? 'active' : ''}`}
            onClick={() => setShowChat(!showChat)}
            title="Toggle chat"
          >
            <FaComment />
          </button>
          
          <button 
            className="control-btn"
            onClick={toggleFullscreen}
            title="Fullscreen"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
          
          <button 
            className="control-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <FaCog />
          </button>
          
          <button 
            className="control-btn end-call"
            onClick={endCall}
            title="End call"
          >
            <FaPhone />
          </button>
        </div>
      </div>

      {/* Participants Panel */}
      {showParticipants && (
        <div className="participants-panel">
          <h4>Participants ({participantsList.length + 1})</h4>
          <div className="participant-list">
            <div className="participant">
              <span>{userName} (You)</span>
            </div>
            {participantsList.map((participant, index) => (
              <div key={index} className="participant">
                <span>{participant.userName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Video component for peer videos
const VideoComponent = ({ peer, userName }) => {
  const ref = useRef();
  const [stream, setStream] = useState();

  useEffect(() => {
    peer.on("stream", stream => {
      ref.current.srcObject = stream;
      setStream(stream);
    });
  }, [peer]);

  return (
    <div className="video-wrapper peer-video">
      <video ref={ref} autoPlay playsInline className="video" />
      <div className="video-overlay">
        <span className="participant-name">{userName}</span>
      </div>
    </div>
  );
};

export default EnhancedLiveMeeting;