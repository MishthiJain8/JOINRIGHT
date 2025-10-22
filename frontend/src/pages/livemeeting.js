import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SOCKET_SERVER_URL = "http://localhost:5000";

const LiveMeeting = ({ roomId, state }) => {
  const userEmail = state?.userName || "guest";
  const socketRef = useRef();
  const userVideo = useRef();
  const peersRef = useRef([]);
  const [peers, setPeers] = useState([]);
  const [stream, setStream] = useState();
  const [chatMessages, setChatMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);

  const mediaRecorderRef = useRef(null);
  const [recordedChunks, setRecordedChunks] = useState([]);

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);

    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((currentStream) => {
      setStream(currentStream);
      userVideo.current.srcObject = currentStream;

      socketRef.current.emit("join-room", { roomId, userId: userEmail });

      socketRef.current.on("user-connected", (userId) => {
        const peer = createPeer(userId, socketRef.current.id, currentStream);
        peersRef.current.push({ peerId: userId, peer });
        setPeers((prev) => [...prev, peer]);
      });

      socketRef.current.on("signal", ({ from, signal }) => {
        const item = peersRef.current.find((p) => p.peerId === from);
        if (item) item.peer.signal(signal);
      });

      socketRef.current.on("chat-message", (data) => {
        setChatMessages((prev) => [...prev, data]);
        // Save chat in MongoDB
        fetch(`http://localhost:5000/api/meetings/${roomId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      });

      socketRef.current.on("user-disconnected", (userId) => {
        const item = peersRef.current.find((p) => p.peerId === userId);
        if (item) {
          item.peer.destroy();
          peersRef.current = peersRef.current.filter((p) => p.peerId !== userId);
          setPeers((prev) => prev.filter((p) => p.peerId !== userId));
        }
      });
    });
  }, [roomId , userEmail]);

  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socketRef.current.emit("signal", { to: userToSignal, from: callerId, signal });
    });
    return peer;
  }

  // Chat
  const sendMessage = () => {
    if (message.trim() === "") return;
    const msgObj = { sender: userEmail, message, time: new Date() };
    socketRef.current.emit("chat-message", msgObj);
    setChatMessages((prev) => [...prev, msgObj]);
    setMessage("");
  };

  // Video & Audio
  const toggleVideo = () => {
    stream.getVideoTracks()[0].enabled = !videoOn;
    setVideoOn(!videoOn);
  };
  const toggleAudio = () => {
    stream.getAudioTracks()[0].enabled = !audioOn;
    setAudioOn(!audioOn);
  };

  // Recording
  const startRecording = () => {
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "video/webm" });
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) setRecordedChunks((prev) => [...prev, e.data]);
    };
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);

      // Download
      const a = document.createElement("a");
      a.href = url;
      a.download = `${roomId}-${Date.now()}.webm`;
      a.click();

      // Save metadata to backend
      fetch("http://localhost:5000/api/meetings/save-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: roomId, fileName: `${roomId}-${Date.now()}.webm` }),
      });

      setRecordedChunks([]);
    };
  };

  return (
    <div style={{ display: "flex", padding: "20px" }}>
      <div style={{ flex: 3 }}>
        <video ref={userVideo} autoPlay muted style={{ width: "300px" }} />
        {peers.map((peer, index) => (
          <Video key={index} peer={peer} />
        ))}

        <div style={{ marginTop: "10px" }}>
          <button onClick={toggleVideo}>{videoOn ? "Video On" : "Video Off"}</button>
          <button onClick={toggleAudio}>{audioOn ? "Mic On" : "Mic Off"}</button>
          <button onClick={startRecording}>Start Recording</button>
          <button onClick={stopRecording}>Stop Recording</button>
        </div>
      </div>

      <div style={{ flex: 1, marginLeft: "20px" }}>
        <h3>Chat</h3>
        <div style={{ height: "400px", overflowY: "scroll", border: "1px solid #ccc", padding: "10px" }}>
          {chatMessages.map((m, i) => (
            <div key={i}><b>{m.sender}:</b> {m.message}</div>
          ))}
        </div>
        <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type message" />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

const Video = ({ peer }) => {
  const ref = useRef();
  useEffect(() => {
    peer.on("stream", (stream) => {
      ref.current.srcObject = stream;
    });
  }, [peer]);
  return <video ref={ref} autoPlay style={{ width: "300px" }} />;
};

export default LiveMeeting;
