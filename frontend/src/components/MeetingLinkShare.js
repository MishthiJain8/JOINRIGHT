import React, { useState, useEffect } from 'react';
import { FaCopy, FaShare, FaQrcode, FaWhatsapp, FaTelegram, FaEnvelope, FaCheck, FaTwitter, FaLinkedin, FaSms } from 'react-icons/fa';
import './MeetingLinkShare.css';

const MeetingLinkShare = ({ meeting, isOpen, onClose }) => {
  const [copied, setCopied] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  if (!isOpen || !meeting) return null;

  // No direct join links - only meeting ID and password sharing

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(type);
    }
  };

  const shareViaWhatsApp = () => {
    const message = `Join my meeting: "${meeting.title}"\n\nMeeting ID: ${meeting.meetingId}\nPassword: ${meeting.password}\nScheduled: ${new Date(meeting.scheduledAt).toLocaleString()}\n\nTo join: Go to the app and enter the Meeting ID and Password above.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaTelegram = () => {
    const message = `Join my meeting: "${meeting.title}"\n\nMeeting ID: ${meeting.meetingId}\nPassword: ${meeting.password}\nScheduled: ${new Date(meeting.scheduledAt).toLocaleString()}\n\nTo join: Go to the app and enter the Meeting ID and Password above.`;
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin + '/join')}&text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Join my meeting: ${meeting.title}`;
    const body = `You're invited to join my meeting!\n\nMeeting: ${meeting.title}\nScheduled: ${new Date(meeting.scheduledAt).toLocaleString()}\n${meeting.description ? `Description: ${meeting.description}\n` : ''}\nMeeting ID: ${meeting.meetingId}\nPassword: ${meeting.password}\n\nTo join: Go to ${window.location.origin}/join and enter the Meeting ID and Password above.\n\nSee you there!`;
    
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const shareViaTwitter = () => {
    const message = `Join my meeting: "${meeting.title}" scheduled for ${new Date(meeting.scheduledAt).toLocaleString()}. Meeting ID: ${meeting.meetingId}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`, '_blank');
  };

  const shareViaLinkedIn = () => {
    const title = `Join my meeting: ${meeting.title}`;
    const summary = `Meeting scheduled for ${new Date(meeting.scheduledAt).toLocaleString()}. Meeting ID: ${meeting.meetingId}`;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.origin + '/join')}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}`, '_blank');
  };

  const shareViaSMS = () => {
    const message = `Join my meeting: "${meeting.title}"\nScheduled: ${new Date(meeting.scheduledAt).toLocaleString()}\nMeeting ID: ${meeting.meetingId}\nPassword: ${meeting.password}\nTo join: Go to ${window.location.origin}/join and enter the Meeting ID and Password`;
    window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
  };

  const generateQRCode = () => {
    // QR code points to join page instead of direct meeting access
    const joinPageUrl = `${window.location.origin}/join`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinPageUrl)}`;
  };

  return (
    <div className="meeting-share-overlay">
      <div className="meeting-share-modal">
        <div className="meeting-share-header">
          <h3>Share Meeting Link</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="meeting-share-content">
          {/* Meeting Info */}
          <div className="meeting-info-card">
            <h4>{meeting.title}</h4>
            <div className="meeting-details">
              <div className="detail-item">
                <label>Meeting ID:</label>
                <span className="meeting-id">{meeting.meetingId}</span>
              </div>
              <div className="detail-item">
                <label>Password:</label>
                <span className="password">{meeting.password}</span>
              </div>
              <div className="detail-item">
                <label>Scheduled:</label>
                <span>{new Date(meeting.scheduledAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Share Links */}
          <div className="share-links">
            <div className="share-option">
              <label>Meeting ID & Password:</label>
              <div className="credentials-group">
                <div className="credential-item">
                  <span>ID: {meeting.meetingId}</span>
                  <button 
                    className={`copy-btn small ${copied === 'id' ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(meeting.meetingId, 'id')}
                  >
                    {copied === 'id' ? <FaCheck /> : <FaCopy />}
                  </button>
                </div>
                <div className="credential-item">
                  <span>Password: {meeting.password}</span>
                  <button 
                    className={`copy-btn small ${copied === 'password' ? 'copied' : ''}`}
                    onClick={() => copyToClipboard(meeting.password, 'password')}
                  >
                    {copied === 'password' ? <FaCheck /> : <FaCopy />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Share Options */}
          <div className="share-actions">
            <h5>Share via:</h5>
            <div className="share-buttons">
              <button className="share-btn whatsapp" onClick={shareViaWhatsApp}>
                <FaWhatsapp /> WhatsApp
              </button>
              <button className="share-btn telegram" onClick={shareViaTelegram}>
                <FaTelegram /> Telegram
              </button>
              <button className="share-btn email" onClick={shareViaEmail}>
                <FaEnvelope /> Email
              </button>
              <button className="share-btn twitter" onClick={shareViaTwitter}>
                <FaTwitter /> Twitter
              </button>
              <button className="share-btn linkedin" onClick={shareViaLinkedIn}>
                <FaLinkedin /> LinkedIn
              </button>
              <button className="share-btn sms" onClick={shareViaSMS}>
                <FaSms /> SMS
              </button>
              <button 
                className="share-btn qr-code" 
                onClick={() => setShowQR(!showQR)}
              >
                <FaQrcode /> QR Code
              </button>
            </div>
          </div>

          {/* QR Code */}
          {showQR && (
            <div className="qr-code-section">
              <h5>QR Code for Join Page:</h5>
              <div className="qr-code-container">
                <img 
                  src={generateQRCode()} 
                  alt="Join Page QR Code"
                  className="qr-code"
                />
                <p>Scan this QR code to go to the join page, then enter the Meeting ID and Password</p>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="share-instructions">
            <h5>How to Join:</h5>
            <ol>
              <li>Go to the app's join page</li>
              <li>Enter the Meeting ID and Password above</li>
              <li>Click "Join Meeting" to participate</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingLinkShare;