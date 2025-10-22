import React, { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaStar, 
  FaLightbulb,
  FaCrown,
  FaCog,
  FaSmile,
  FaPuzzlePiece,
  FaHandsHelping,
  FaTrophy
} from 'react-icons/fa';
import './HostAwardModal.css';

const HostAwardModal = ({ 
  isOpen, 
  onClose, 
  participant, 
  onSubmitAward, 
  currentUser,
  meetingId 
}) => {
  const [selectedAward, setSelectedAward] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [pointsAwarded, setPointsAwarded] = useState(5);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [awardTypes, setAwardTypes] = useState({});

  // Award type configurations with icons
  const awardConfigs = {
    'excellent_participation': { 
      icon: <FaStar />, 
      color: '#10B981',
      label: 'Excellent Participation',
      description: 'Active and meaningful participation throughout the meeting',
      defaultPoints: 5
    },
    'helpful_contribution': { 
      icon: <FaLightbulb />, 
      color: '#3B82F6',
      label: 'Helpful Contribution',
      description: 'Provided valuable insights or helpful suggestions',
      defaultPoints: 7
    },
    'leadership': { 
      icon: <FaCrown />, 
      color: '#8B5CF6',
      label: 'Leadership Skills',
      description: 'Demonstrated leadership qualities and guided discussions',
      defaultPoints: 10
    },
    'technical_assistance': { 
      icon: <FaCog />, 
      color: '#06B6D4',
      label: 'Technical Assistance',
      description: 'Helped others with technical issues or shared expertise',
      defaultPoints: 8
    },
    'positive_attitude': { 
      icon: <FaSmile />, 
      color: '#F59E0B',
      label: 'Positive Attitude',
      description: 'Maintained a positive and encouraging atmosphere',
      defaultPoints: 6
    },
    'problem_solving': { 
      icon: <FaPuzzlePiece />, 
      color: '#EF4444',
      label: 'Problem Solving',
      description: 'Effectively solved problems or helped resolve conflicts',
      defaultPoints: 9
    },
    'collaborative_spirit': { 
      icon: <FaHandsHelping />, 
      color: '#84CC16',
      label: 'Collaborative Spirit',
      description: 'Worked well with others and promoted team cooperation',
      defaultPoints: 6
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAwardTypes();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedAward && awardConfigs[selectedAward]) {
      setPointsAwarded(awardConfigs[selectedAward].defaultPoints);
    }
  }, [selectedAward]);

  const fetchAwardTypes = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cyber-score/award-types`);
      const data = await response.json();
      if (data.success) {
        setAwardTypes(data.awardTypes);
      }
    } catch (error) {
      console.error('Error fetching award types:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAward || !customReason.trim()) return;

    setIsSubmitting(true);
    try {
      const awardData = {
        hostId: currentUser.id,
        meetingId,
        awardType: selectedAward,
        reason: customReason.trim(),
        pointsAwarded,
        comments: comments.trim()
      };

      await onSubmitAward(participant.socketId, awardData);
      
      // Reset form
      setSelectedAward('');
      setCustomReason('');
      setPointsAwarded(5);
      setComments('');
      onClose();
    } catch (error) {
      console.error('Error submitting award:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedAward('');
    setCustomReason('');
    setPointsAwarded(5);
    setComments('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="host-award-modal-overlay">
      <div className="host-award-modal">
        <div className="modal-header">
          <div className="header-content">
            <FaTrophy className="award-icon" />
            <h2>Award Participant</h2>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
        </div>

        <div className="modal-body">
          <div className="participant-info">
            <div className="participant-avatar">
              <FaStar />
            </div>
            <div>
              <h3>{participant?.userName}</h3>
              <p>Current Cyber Score: {participant?.cyberScore?.currentScore || 85}/100</p>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-section">
              <label>Award Type *</label>
              <div className="award-types-grid">
                {Object.entries(awardConfigs).map(([key, config]) => (
                  <div
                    key={key}
                    className={`award-type-card ${selectedAward === key ? 'selected' : ''}`}
                    onClick={() => setSelectedAward(key)}
                  >
                    <div className="award-icon-container" style={{ color: config.color }}>
                      {config.icon}
                    </div>
                    <div className="award-info">
                      <h4>{config.label}</h4>
                      <p>{config.description}</p>
                      <span className="default-points">+{config.defaultPoints} points</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedAward && (
              <>
                <div className="form-section">
                  <label htmlFor="reason">Reason for Award *</label>
                  <textarea
                    id="reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please describe what the participant did to earn this award..."
                    rows="3"
                    required
                  />
                </div>

                <div className="form-section">
                  <label htmlFor="comments">Additional Comments (Optional)</label>
                  <textarea
                    id="comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Any additional positive feedback or encouragement..."
                    rows="2"
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="points">Points to Award</label>
                    <div className="points-input-container">
                      <input
                        type="number"
                        id="points"
                        value={pointsAwarded}
                        onChange={(e) => setPointsAwarded(Math.max(1, Math.min(25, parseInt(e.target.value) || 1)))}
                        min="1"
                        max="25"
                      />
                      <span className="points-label">/ 25</span>
                    </div>
                    <small>Maximum 25 points can be awarded at once</small>
                  </div>
                </div>

                <div className="impact-preview positive">
                  <h4>Impact Preview</h4>
                  <div className="impact-details">
                    <div className="score-change">
                      <span className="current-score">
                        Current: {participant?.cyberScore?.currentScore || 85}
                      </span>
                      <span className="arrow">→</span>
                      <span className="new-score positive">
                        New: {Math.min(100, (participant?.cyberScore?.currentScore || 85) + pointsAwarded)}
                      </span>
                    </div>
                    <div className="points-award">
                      +{pointsAwarded} points
                    </div>
                  </div>
                  <div className="award-benefits">
                    <p>🌟 This award will encourage positive behavior and improve the participant's reputation!</p>
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
                className="btn-success"
                disabled={!selectedAward || !customReason.trim() || isSubmitting}
              >
                {isSubmitting ? 'Awarding...' : 'Award Participant'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HostAwardModal;