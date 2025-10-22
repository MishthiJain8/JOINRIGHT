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

const SOCKET_SERVER_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
    <div className="enhanced-meeting-container">
      {/* Add your JSX here - keeping the same structure as original */}
      <div className="meeting-header">
        <h2>Meeting: {roomId}</h2>
        <button onClick={endCall} className="end-call-btn">
          <FaPhone /> End Call
        </button>
      </div>
      
      <div className="video-container">
        <video ref={userVideo} autoPlay playsInline muted />
        {/* Add peer videos */}
        {peers.map((peer, index) => (
          <Video key={index} peer={peer.peer} userName={peer.userName} />
        ))}
      </div>

      <div className="controls">
        <button onClick={toggleAudio} className={isAudioOn ? 'active' : ''}>
          {isAudioOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
        <button onClick={toggleVideo} className={isVideoOn ? 'active' : ''}>
          {isVideoOn ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button onClick={isScreenSharing ? stopScreenShare : startScreenShare}>
          <FaDesktop />
        </button>
        <button onClick={isRecording ? stopRecording : startRecording}>
          {isRecording ? <FaStop /> : <FaRecordVinyl />}
        </button>
        <button onClick={() => setShowChat(!showChat)}>
          <FaComment />
        </button>
      </div>

      {showChat && (
        <div className="chat-panel">
          <div className="chat-messages" ref={chatContainerRef}>
            {chatMessages.map((msg, index) => (
              <div key={index} className="message">
                <strong>{msg.sender}:</strong> {msg.message}
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') sendMessage();
                handleTyping();
              }}
              placeholder="Type a message..."
            />
            <button onClick={sendMessage}>
              <FaPaperPlane />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Video component for peer streams
const Video = ({ peer, userName }) => {
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

  return (
    <div className="peer-video">
      <video ref={ref} autoPlay playsInline />
      <div className="peer-name">{userName}</div>
    </div>
  );
};

export default EnhancedLiveMeeting;