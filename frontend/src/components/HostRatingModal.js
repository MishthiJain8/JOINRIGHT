import React, { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaExclamationTriangle, 
  FaUserSlash, 
  FaCommentSlash,
  FaBullhorn,
  FaEyeSlash,
  FaKeyboard,
  FaDesktop,
  FaUser
} from 'react-icons/fa';
import './HostRatingModal.css';

const HostRatingModal = ({ 
  isOpen, 
  onClose, 
  participant, 
  onSubmitRating, 
  currentUser,
  meetingId 
}) => {
  const [selectedIncident, setSelectedIncident] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [pointsDeducted, setPointsDeducted] = useState(5);
  const [severity, setSeverity] = useState('minor');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [incidentTypes, setIncidentTypes] = useState({});

  // Incident type configurations with icons
  const incidentConfigs = {
    'disruptive_behavior': { 
      icon: <FaBullhorn />, 
      color: '#F59E0B',
      label: 'Disruptive Behavior',
      description: 'Interrupting, shouting, or causing disturbance',
      defaultPoints: 5
    },
    'inappropriate_content': { 
      icon: <FaEyeSlash />, 
      color: '#EF4444',
      label: 'Inappropriate Content',
      description: 'Sharing offensive or inappropriate material',
      defaultPoints: 10
    },
    'harassment': { 
      icon: <FaUserSlash />, 
      color: '#DC2626',
      label: 'Harassment',
      description: 'Bullying, discrimination, or harassment of participants',
      defaultPoints: 20
    },
    'spam': { 
      icon: <FaCommentSlash />, 
      color: '#F59E0B',
      label: 'Spam/Flooding',
      description: 'Repeatedly sending messages or disrupting chat',
      defaultPoints: 5
    },
    'technical_abuse': { 
      icon: <FaKeyboard />, 
      color: '#8B5CF6',
      label: 'Technical Abuse',
      description: 'Misusing features, excessive screen sharing, etc.',
      defaultPoints: 8
    },
    'excessive_interruption': { 
      icon: <FaBullhorn />, 
      color: '#F59E0B',
      label: 'Excessive Interruption',
      description: 'Constantly interrupting speakers',
      defaultPoints: 7
    },
    'inappropriate_screen_share': { 
      icon: <FaDesktop />, 
      color: '#EF4444',
      label: 'Inappropriate Screen Share',
      description: 'Sharing inappropriate or offensive content via screen share',
      defaultPoints: 15
    },
    'verbal_abuse': { 
      icon: <FaUserSlash />, 
      color: '#DC2626',
      label: 'Verbal Abuse',
      description: 'Using offensive language or verbal attacks',
      defaultPoints: 18
    },
    'trolling': { 
      icon: <FaUser />, 
      color: '#8B5CF6',
      label: 'Trolling',
      description: 'Deliberately provoking or annoying other participants',
      defaultPoints: 10
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchIncidentTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedIncident && incidentConfigs[selectedIncident]) {
      setPointsDeducted(incidentConfigs[selectedIncident].defaultPoints);
      // Set severity based on points
      const points = incidentConfigs[selectedIncident].defaultPoints;
      if (points >= 18) setSeverity('major');
      else if (points >= 10) setSeverity('moderate');
      else setSeverity('minor');
    }
  }, [selectedIncident]);

  const fetchIncidentTypes = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cyber-score/incident-types`);
      const data = await response.json();
      if (data.success) {
        setIncidentTypes(data.incidentTypes);
      }
    } catch (error) {
      console.error('Error fetching incident types:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIncident || !customReason.trim()) return;

    setIsSubmitting(true);
    try {
      const ratingData = {
        hostId: currentUser.id,
        meetingId,
        incidentType: selectedIncident,
        reason: customReason.trim(),
        pointsDeducted,
        severity
      };

      await onSubmitRating(participant.socketId, ratingData);
      
      // Reset form
      setSelectedIncident('');
      setCustomReason('');
      setPointsDeducted(5);
      setSeverity('minor');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedIncident('');
    setCustomReason('');
    setPointsDeducted(5);
    setSeverity('minor');
    onClose();
  };

  const getSeverityColor = (sev) => {
    switch (sev) {
      case 'minor': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'major': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="host-rating-modal-overlay">
      <div className="host-rating-modal">
        <div className="modal-header">
          <div className="header-content">
            <FaExclamationTriangle className="warning-icon" />
            <h2>Rate Participant Behavior</h2>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="participant-info">
            <div className="participant-avatar">
              <FaUser />
            </div>
            <div>
              <h3>{participant?.userName}</h3>
              <p>Current Cyber Score: {participant?.cyberScore?.currentScore || 85}/100</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <label>Incident Type *</label>
              <div className="incident-types-grid">
                {Object.entries(incidentConfigs).map(([key, config]) => (
                  <div
                    key={key}
                    className={`incident-type-card ${selectedIncident === key ? 'selected' : ''}`}
                    onClick={() => setSelectedIncident(key)}
                  >
                    <div className="incident-icon" style={{ color: config.color }}>
                      {config.icon}
                    </div>
                    <div className="incident-info">
                      <h4>{config.label}</h4>
                      <p>{config.description}</p>
                      <span className="default-points">-{config.defaultPoints} points</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedIncident && (
              <>
                <div className="form-section">
                  <label htmlFor="reason">Detailed Reason *</label>
                  <textarea
                    id="reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please provide specific details about the incident..."
                    rows="4"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="points">Points to Deduct</label>
                    <div className="points-input-container">
                      <input
                        type="number"
                        id="points"
                        value={pointsDeducted}
                        onChange={(e) => setPointsDeducted(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                        min="1"
                        max="50"
                      />
                      <span className="points-label">/ 100</span>
                    </div>
                  </div>

                  <div className="form-field">
                    <label htmlFor="severity">Severity</label>
                    <select
                      id="severity"
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                    >
                      <option value="minor">Minor</option>
                      <option value="moderate">Moderate</option>
                      <option value="major">Major</option>
                    </select>
                    <div 
                      className="severity-indicator"
                      style={{ backgroundColor: getSeverityColor(severity) }}
                    ></div>
                  </div>
                </div>

                <div className="impact-preview">
                  <h4>Impact Preview</h4>
                  <div className="impact-details">
                    <div className="score-change">
                      <span className="current-score">
                        Current: {participant?.cyberScore?.currentScore || 85}
                      </span>
                      <span className="arrow">→</span>
                      <span className="new-score">
                        New: {Math.max(0, (participant?.cyberScore?.currentScore || 85) - pointsDeducted)}
                      </span>
                    </div>
                    <div className="points-deduction">
                      -{pointsDeducted} points
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-danger"
                disabled={!selectedIncident || !customReason.trim() || isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostRatingModal;