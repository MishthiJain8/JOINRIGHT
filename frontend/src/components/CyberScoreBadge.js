import React from 'react';
import './CyberScoreBadge.css';

const CyberScoreBadge = ({ 
  score = 85, 
  reputationLevel = 'good', 
  size = 'small',
  showLabel = true,
  totalMeetings = 0,
  isRestricted = false
}) => {
  const getScoreConfig = (level, currentScore) => {
    const configs = {
      excellent: { 
        color: '#10B981', 
        bgColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        icon: '🌟', 
        label: 'Excellent',
        textColor: '#10B981'
      },
      good: { 
        color: '#059669', 
        bgColor: 'rgba(5, 150, 105, 0.15)',
        borderColor: 'rgba(5, 150, 105, 0.3)',
        icon: '✅', 
        label: 'Good',
        textColor: '#059669'
      },
      average: { 
        color: '#F59E0B', 
        bgColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.3)',
        icon: '⚠️', 
        label: 'Fair',
        textColor: '#F59E0B'
      },
      poor: { 
        color: '#EF4444', 
        bgColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
        icon: '❌', 
        label: 'Poor',
        textColor: '#EF4444'
      },
      banned: { 
        color: '#7F1D1D', 
        bgColor: 'rgba(127, 29, 29, 0.15)',
        borderColor: 'rgba(127, 29, 29, 0.3)',
        icon: '🚫', 
        label: 'Blocked',
        textColor: '#7F1D1D'
      }
    };

    return configs[level] || configs.good;
  };

  const config = getScoreConfig(reputationLevel, score);

  const getScoreBarWidth = () => {
    return Math.max(5, Math.min(100, score));
  };

  const getScoreBarColor = () => {
    if (score >= 85) return '#10B981';
    if (score >= 70) return '#059669';
    if (score >= 50) return '#F59E0B';
    if (score >= 25) return '#EF4444';
    return '#7F1D1D';
  };

  const formatScore = (score) => {
    return Math.round(score);
  };

  return (
    <div className={`cyber-score-badge ${size} ${reputationLevel}`}>
      <div className="score-container">
        <div className="score-icon-wrapper" style={{ backgroundColor: config.bgColor, borderColor: config.borderColor }}>
          <span className="score-icon">{config.icon}</span>
        </div>
        
        <div className="score-content">
          <div className="score-main">
            <span className="score-number" style={{ color: config.textColor }}>
              {formatScore(score)}
            </span>
            {size !== 'mini' && (
              <span className="score-max">/100</span>
            )}
          </div>
          
          {showLabel && size !== 'mini' && (
            <div className="score-label">
              <span className="reputation-level" style={{ color: config.color }}>
                {config.label}
              </span>
              {totalMeetings > 0 && size === 'large' && (
                <span className="meeting-count">
                  {totalMeetings} meeting{totalMeetings !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>

        {size === 'large' && (
          <div className="score-bar-container">
            <div className="score-bar-background">
              <div 
                className="score-bar-fill"
                style={{ 
                  width: `${getScoreBarWidth()}%`,
                  backgroundColor: getScoreBarColor()
                }}
              ></div>
            </div>
            <div className="score-percentage">
              {formatScore(score)}%
            </div>
          </div>
        )}
      </div>

      {isRestricted && (
        <div className="restriction-warning">
          <span className="restriction-icon">🔒</span>
          <span className="restriction-text">Restricted</span>
        </div>
      )}
    </div>
  );
};

export default CyberScoreBadge;