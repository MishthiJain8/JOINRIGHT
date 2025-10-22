import React from 'react';
import { FaVideo, FaUsers, FaClock, FaCalendar, FaShare, FaPlay, FaCopy, FaTimes, FaEye, FaMicrophone, FaDesktop, FaComments, FaRecordVinyl, FaLock } from 'react-icons/fa';
import './MeetingDetailModal.css';

const MeetingDetailModal = ({ meeting, isOpen, onClose, onJoinMeeting, onShareMeeting }) => {
  if (!isOpen || !meeting) return null;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // You can add a toast notification here
  };

  const getMeetingStatus = () => {
    const now = new Date();
    const meetingDate = new Date(meeting.scheduledAt);
    const timeDiff = meetingDate.getTime() - now.getTime();
    const minutesUntil = Math.floor(timeDiff / (1000 * 60));

    if (meeting.status === 'ended') return { label: 'Ended', class: 'ended' };
    if (meeting.status === 'active') return { label: 'Active', class: 'active' };
    if (minutesUntil <= 0) return { label: 'Starting Now', class: 'starting' };
    if (minutesUntil <= 15) return { label: 'Starting Soon', class: 'soon' };
    return { label: 'Scheduled', class: 'scheduled' };
  };

  const canJoinMeeting = () => {
    const now = new Date();
    const meetingDate = new Date(meeting.scheduledAt);
    const minutesUntil = Math.floor((meetingDate.getTime() - now.getTime()) / (1000 * 60));
    return minutesUntil <= 5 && minutesUntil >= -30; // Can join 5 min before to 30 min after
  };

  const status = getMeetingStatus();

  return (
    <div className="meeting-detail-overlay" onClick={onClose}>
      <div className="meeting-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="meeting-detail-header">
          <div className="header-content">
            <div className="meeting-title-section">
              <h2>{meeting.title}</h2>
              <div className={`meeting-status-badge ${status.class}`}>
                {status.label}
              </div>
            </div>
            <button className="close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="meeting-detail-content">
          {/* Meeting Info */}
          <div className="detail-section">
            <div className="section-header">
              <FaCalendar className="section-icon" />
              <h3>Meeting Information</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <label>Date</label>
                <span>{formatDate(meeting.scheduledAt)}</span>
              </div>
              <div className="info-item">
                <label>Time</label>
                <span>{formatTime(meeting.scheduledAt)}</span>
              </div>
              <div className="info-item">
                <label>Meeting ID</label>
                <div className="copyable-field">
                  <span className="meeting-id-text">{meeting.meetingId}</span>
                  <button 
                    className="copy-btn-small" 
                    onClick={() => copyToClipboard(meeting.meetingId)}
                    title="Copy Meeting ID"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
              <div className="info-item">
                <label>Password</label>
                <div className="copyable-field">
                  <span className="password-text">{meeting.password}</span>
                  <button 
                    className="copy-btn-small" 
                    onClick={() => copyToClipboard(meeting.password)}
                    title="Copy Password"
                  >
                    <FaCopy />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {meeting.description && (
            <div className="detail-section">
              <div className="section-header">
                <h3>Description</h3>
              </div>
              <p className="meeting-description">{meeting.description}</p>
            </div>
          )}

          {/* Participants */}
          <div className="detail-section">
            <div className="section-header">
              <FaUsers className="section-icon" />
              <h3>Participants ({meeting.participants?.length || 0})</h3>
            </div>
            <div className="participants-list">
              {meeting.participants && meeting.participants.length > 0 ? (
                meeting.participants.map((participant, index) => (
                  <div key={index} className="participant-item">
                    <div className="participant-avatar">
                      {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div className="participant-info">
                      <span className="participant-name">{participant.name || participant.email}</span>
                      <span className="participant-email">{participant.email}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-participants">
                  <FaUsers className="empty-icon" />
                  <p>No participants yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Meeting Settings */}
          <div className="detail-section">
            <div className="section-header">
              <h3>Meeting Settings</h3>
            </div>
            <div className="settings-grid">
              <div className={`setting-item ${meeting.settings?.allowScreenShare ? 'enabled' : 'disabled'}`}>
                <FaDesktop className="setting-icon" />
                <span>Screen Share</span>
                <div className={`setting-toggle ${meeting.settings?.allowScreenShare ? 'on' : 'off'}`}>
                  {meeting.settings?.allowScreenShare ? 'On' : 'Off'}
                </div>
              </div>
              <div className={`setting-item ${meeting.settings?.allowChat ? 'enabled' : 'disabled'}`}>
                <FaComments className="setting-icon" />
                <span>Chat</span>
                <div className={`setting-toggle ${meeting.settings?.allowChat ? 'on' : 'off'}`}>
                  {meeting.settings?.allowChat ? 'On' : 'Off'}
                </div>
              </div>
              <div className={`setting-item ${meeting.settings?.allowRecording ? 'enabled' : 'disabled'}`}>
                <FaRecordVinyl className="setting-icon" />
                <span>Recording</span>
                <div className={`setting-toggle ${meeting.settings?.allowRecording ? 'on' : 'off'}`}>
                  {meeting.settings?.allowRecording ? 'On' : 'Off'}
                </div>
              </div>
              <div className={`setting-item ${meeting.settings?.waitingRoom ? 'enabled' : 'disabled'}`}>
                <FaLock className="setting-icon" />
                <span>Waiting Room</span>
                <div className={`setting-toggle ${meeting.settings?.waitingRoom ? 'on' : 'off'}`}>
                  {meeting.settings?.waitingRoom ? 'On' : 'Off'}
                </div>
              </div>
              <div className={`setting-item ${meeting.settings?.muteOnEntry ? 'enabled' : 'disabled'}`}>
                <FaMicrophone className="setting-icon" />
                <span>Mute on Entry</span>
                <div className={`setting-toggle ${meeting.settings?.muteOnEntry ? 'on' : 'off'}`}>
                  {meeting.settings?.muteOnEntry ? 'On' : 'Off'}
                </div>
              </div>
            </div>
          </div>

          {/* Meeting Link */}
          <div className="detail-section">
            <div className="section-header">
              <h3>Meeting Link</h3>
            </div>
            <div className="link-section">
              <div className="link-field">
                <input 
                  type="text" 
                  value={meeting.link || `${window.location.origin}/meeting/${meeting.meetingId}`}
                  readOnly
                  className="meeting-link-input"
                />
                <button 
                  className="copy-btn" 
                  onClick={() => copyToClipboard(meeting.link || `${window.location.origin}/meeting/${meeting.meetingId}`)}
                >
                  <FaCopy />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="meeting-detail-footer">
          <div className="action-buttons">
            <button 
              className="btn-secondary"
              onClick={() => onShareMeeting && onShareMeeting(meeting)}
            >
              <FaShare />
              <span>Share</span>
            </button>
            {canJoinMeeting() && (
              <button 
                className="btn-primary"
                onClick={() => onJoinMeeting && onJoinMeeting(meeting)}
              >
                <FaPlay />
                <span>Join Meeting</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingDetailModal;