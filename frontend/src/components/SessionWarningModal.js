import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const SessionWarningModal = () => {
  const { showSessionWarning, extendSession, handleSessionExpired } = useAuth();
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds

  useEffect(() => {
    if (!showSessionWarning) {
      setCountdown(300);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSessionExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [showSessionWarning, handleSessionExpired]);

  if (!showSessionWarning) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinueSession = () => {
    extendSession();
  };

  const handleLogout = () => {
    handleSessionExpired();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.warningIcon}>⚠️</div>
          <h2 style={styles.title}>Session Expiring Soon</h2>
        </div>
        
        <div style={styles.content}>
          <p style={styles.message}>
            Your session will expire in <strong>{formatTime(countdown)}</strong> due to inactivity.
          </p>
          <p style={styles.submessage}>
            You will be automatically logged out to protect your account security.
          </p>
        </div>

        <div style={styles.actions}>
          <button 
            style={styles.continueButton}
            onClick={handleContinueSession}
          >
            Continue Session
          </button>
          <button 
            style={styles.logoutButton}
            onClick={handleLogout}
          >
            Logout Now
          </button>
        </div>

        <div style={styles.countdown}>
          <div style={styles.progressBar}>
            <div 
              style={{
                ...styles.progress,
                width: `${(countdown / 300) * 100}%`
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)',
  },

  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '0',
    maxWidth: '450px',
    width: '90%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    animation: 'slideIn 0.3s ease-out',
    overflow: 'hidden',
  },

  header: {
    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
    color: '#fff',
    padding: '24px',
    textAlign: 'center',
  },

  warningIcon: {
    fontSize: '48px',
    marginBottom: '8px',
  },

  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: '600',
  },

  content: {
    padding: '24px',
    textAlign: 'center',
  },

  message: {
    fontSize: '16px',
    color: '#374151',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
  },

  submessage: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },

  actions: {
    display: 'flex',
    gap: '12px',
    padding: '0 24px 24px',
  },

  continueButton: {
    flex: 1,
    background: 'linear-gradient(135deg, #10b981, #059669)',
    color: '#fff',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  logoutButton: {
    flex: 1,
    background: 'transparent',
    color: '#6b7280',
    border: '2px solid #d1d5db',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  countdown: {
    padding: '0 24px 24px',
  },

  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#f3f4f6',
    borderRadius: '3px',
    overflow: 'hidden',
  },

  progress: {
    height: '100%',
    background: 'linear-gradient(90deg, #ef4444, #f59e0b)',
    borderRadius: '3px',
    transition: 'width 1s linear',
  },
};

// Add CSS animation keyframes
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = `
    @keyframes slideIn {
      0% { 
        opacity: 0; 
        transform: translateY(-20px) scale(0.95); 
      }
      100% { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
      }
    }
  `;
  if (!document.head.querySelector('style[data-session-warning]')) {
    styleSheet.setAttribute('data-session-warning', 'true');
    document.head.appendChild(styleSheet);
  }
}

export default SessionWarningModal;