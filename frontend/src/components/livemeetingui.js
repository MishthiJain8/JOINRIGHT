import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SOCKET_SERVER_URL = "http://localhost:5000";

const LiveMeetingUI = ({ roomId, state }) => {
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
  const [showChat, setShowChat] = useState(true);
  const mediaRecorderRef = useRef(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [recordings, setRecordings] = useState([]);

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

    // Fetch existing recordings
    fetch(`http://localhost:5000/api/meetings/${roomId}/recordings`)
      .then((res) => res.json())
      .then((data) => setRecordings(data.recordings));
  }, [roomId , userEmail]);

  function createPeer(userToSignal, callerId, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (signal) => {
      socketRef.current.emit("signal", { to: userToSignal, from: callerId, signal });
    });
    return peer;
  }

  const sendMessage = () => {
    if (!message.trim()) return;
    const msgObj = { sender: userEmail, message, time: new Date() };
    socketRef.current.emit("chat-message", msgObj);
    setChatMessages((prev) => [...prev, msgObj]);
    setMessage("");
  };

  const toggleVideo = () => { stream.getVideoTracks()[0].enabled = !videoOn; setVideoOn(!videoOn); };
  const toggleAudio = () => { stream.getAudioTracks()[0].enabled = !audioOn; setAudioOn(!audioOn); };

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
      const fileName = `${roomId}-${Date.now()}.webm`;

      // Download
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();

      // Save metadata
      fetch("http://localhost:5000/api/meetings/save-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: roomId, fileName }),
      });

      setRecordings((prev) => [...prev, { fileName, createdAt: new Date() }]);
      setRecordedChunks([]);
    };
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Video Grid */}
      <div style={{ flex: 3, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", padding: "10px" }}>
        <Video peer={null} stream={stream} isSelf />
        {peers.map((peer, i) => <Video key={i} peer={peer} />)}
      </div>

      {/* Sidebar */}
      <div style={{ flex: 1, borderLeft: "1px solid #ccc", display: "flex", flexDirection: "column" }}>
        <button onClick={() => setShowChat(!showChat)}>{showChat ? "Hide Chat" : "Show Chat"}</button>
        {showChat && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <h3>Chat</h3>
            <div style={{ flex: 1, overflowY: "scroll", padding: "10px", border: "1px solid #ccc" }}>
              {chatMessages.map((m, i) => <div key={i}><b>{m.sender}:</b> {m.message}</div>)}
            </div>
            <input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type message" />
            <button onClick={sendMessage}>Send</button>
          </div>
        )}

        {/* Controls */}
        <div style={{ padding: "10px", borderTop: "1px solid #ccc" }}>
          <button onClick={toggleVideo}>{videoOn ? "Video On" : "Video Off"}</button>
          <button onClick={toggleAudio}>{audioOn ? "Mic On" : "Mic Off"}</button>
          <button onClick={startRecording}>Start Recording</button>
          <button onClick={stopRecording}>Stop Recording</button>
        </div>

        {/* Recordings Playback */}
        <div style={{ padding: "10px", borderTop: "1px solid #ccc", overflowY: "scroll", maxHeight: "200px" }}>
          <h4>Recordings</h4>
          {recordings.map((rec, i) => (
            <video key={i} src={`http://localhost:5000/recordings/${rec.fileName}`} controls style={{ width: "100%", marginBottom: "10px" }} />
          ))}
        </div>
      </div>
    </div>
  );
};

const Video = ({ peer, stream, isSelf }) => {
  const ref = useRef();
  useEffect(() => {
    if (isSelf && stream) ref.current.srcObject = stream;
    else if (peer) peer.on("stream", (s) => ref.current.srcObject = s);
  }, [peer, stream, isSelf]);
  return <video ref={ref} autoPlay muted={isSelf} style={{ width: "100%", height: "200px", backgroundColor: "#000" }} />;
};

export default LiveMeetingUI;
