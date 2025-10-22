import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import Header from '../components/header';
import Footer from '../components/footer';
import { useAuth } from '../contexts/AuthContext';
import { buildApiUrl } from '../config/api';
import './JoinMeeting.css';

const JoinMeeting = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { meetingId: urlMeetingId } = useParams();
  const { user } = useAuth();
  
  const [meetingId, setMeetingId] = useState(urlMeetingId || '');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [meetingInfo, setMeetingInfo] = useState(null);

  useEffect(() => {
    // First, check for meeting data from dashboard navigation
    if (location.state?.meetingData || location.state?.prefilledData) {
      const meetingData = location.state.meetingData || location.state.prefilledData;
      console.log('📋 Loading meeting data from dashboard:', meetingData);
      
      if (meetingData.meetingId) {
        setMeetingId(meetingData.meetingId);
      }
      if (meetingData.password) {
        setPassword(meetingData.password);
      }
      
      // Clear the navigation state to prevent reuse
      window.history.replaceState({}, document.title);
    } else {
      // Check for pending meeting data from sessionStorage (from meeting links)
      const pendingMeeting = sessionStorage.getItem('pendingMeeting');
      if (pendingMeeting) {
        try {
          const meetingData = JSON.parse(pendingMeeting);
          console.log('🔗 Loading meeting data from link:', meetingData);
          
          if (meetingData.meetingId) {
            setMeetingId(meetingData.meetingId);
          }
          if (meetingData.password) {
            setPassword(meetingData.password);
          }
          
          // Clear the sessionStorage after using the data
          sessionStorage.removeItem('pendingMeeting');
        } catch (error) {
          console.warn('Failed to parse pending meeting data:', error);
        }
      } else {
        // Fallback: Get password from URL parameters if provided
        const urlParams = new URLSearchParams(location.search);
        const pwdParam = urlParams.get('pwd');
        if (pwdParam) {
          setPassword(decodeURIComponent(pwdParam));
        }
      }
    }

    // Set default username if user is logged in
    if (user) {
      setUserName(user.firstName ? `${user.firstName} ${user.lastName}` : user.email);
    }
  }, [location.search, location.state, user]);

  const handleJoinMeeting = async () => {
    // Check if user is authenticated first
    if (!user) {
      // Store meeting details for after login
      const meetingData = {
        meetingId: meetingId.trim(),
        password: password.trim(),
        userName: userName.trim()
      };
      sessionStorage.setItem('pendingMeeting', JSON.stringify(meetingData));
      
      // Redirect to login with return URL
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?returnUrl=${returnUrl}&type=meeting`);
      return;
    }

    if (!meetingId.trim()) {
      setError('Please enter a Meeting ID');
      return;
    }

    if (!password.trim()) {
      setError('Please enter the meeting password');
      return;
    }

    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First, validate the meeting exists and get info
      const validateRes = await fetch(buildApiUrl(`/api/meetings/meeting/${meetingId}`));
      const validateData = await validateRes.json();
      
      if (!validateRes.ok) {
        setError(validateData.error || 'Meeting not found');
        setIsLoading(false);
        return;
      }

      setMeetingInfo(validateData.meeting);

      // If user is logged in, use their email, otherwise use the provided name
      const userIdentifier = user?.email || userName;

      // Attempt to join the meeting
      const joinRes = await fetch(buildApiUrl('/api/meetings/join'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetingId,
          password,
          user: userIdentifier
        }),
      });

      const joinData = await joinRes.json();

      if (joinRes.ok && joinData.success) {
        // Store meeting info in localStorage for the live meeting component
        localStorage.setItem('currentMeeting', JSON.stringify({
          meetingId,
          meetingInfo: joinData.meeting,
          userName: userName,
          userEmail: userIdentifier
        }));

        // Navigate to the live meeting
        navigate(`/live/${meetingId}`, { 
          state: { 
            userName: userName,
            userEmail: userIdentifier,
            meetingData: joinData.meeting 
          } 
        });
      } else {
        setError(joinData.error || 'Failed to join meeting');
      }
    } catch (error) {
      console.error('Join meeting error:', error);
      setError('Unable to connect to the meeting. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMeetingIdChange = (e) => {
    let value = e.target.value.toUpperCase();
    
    // Remove any characters that aren't letters, numbers, or hyphens
    value = value.replace(/[^A-Z0-9-]/g, '');
    
    // Auto-format the meeting ID as user types (ABC-123-DEF)
    if (value.length <= 11) { // Max length for ABC-123-DEF format
      // Remove existing hyphens for processing
      const cleanValue = value.replace(/-/g, '');
      
      // Format as ABC-123-DEF
      let formattedValue = '';
      if (cleanValue.length > 0) {
        formattedValue = cleanValue.substring(0, 3);
        if (cleanValue.length > 3) {
          formattedValue += '-' + cleanValue.substring(3, 6);
          if (cleanValue.length > 6) {
            formattedValue += '-' + cleanValue.substring(6, 9);
          }
        }
      }
      
      setMeetingId(formattedValue);
    }
    
    setError('');
  };

  return (
    <div className="join-meeting-page">
      <Header />
      <div className="join-meeting-container">
        <div className="join-form-wrapper">
          <div className="join-form">
            <div className="form-header">
              <h1>Join a Meeting</h1>
              <p>Enter your meeting details to join</p>
            </div>

            {meetingInfo && (
              <div className="meeting-preview">
                <h3>📅 {meetingInfo.title}</h3>
                <p>🕒 {new Date(meetingInfo.scheduledAt).toLocaleString()}</p>
                {meetingInfo.description && (
                  <p className="meeting-description">{meetingInfo.description}</p>
                )}
                <div className="meeting-status">
                  <span className={`status-badge ${meetingInfo.status}`}>
                    {meetingInfo.status.charAt(0).toUpperCase() + meetingInfo.status.slice(1)}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleJoinMeeting(); }}>
              <div className="form-group">
                <label htmlFor="meetingId">Meeting ID *</label>
                <input
                  type="text"
                  id="meetingId"
                  value={meetingId}
                  onChange={handleMeetingIdChange}
                  placeholder="Enter Meeting ID (e.g., ABC-123-DEF)"
                  maxLength={11}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Meeting Password *</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter meeting password"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="userName">Your Name *</label>
                <input
                  type="text"
                  id="userName"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    setError('');
                  }}
                  placeholder="Enter your display name"
                  required
                />
              </div>

              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}

              {!user && (
                <div className="auth-notice">
                  <div className="notice-icon">🔒</div>
                  <div className="notice-content">
                    <strong>Login Required</strong>
                    <p>You need to be logged in to join meetings. Click "Join Meeting" to login or sign up.</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`join-btn ${!user ? 'auth-required' : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner"></span>
                    Joining...
                  </>
                ) : (
                  <>
                    <span className="join-icon">{user ? '🎥' : '🔐'}</span>
                    {user ? 'Join Meeting' : 'Login to Join Meeting'}
                  </>
                )}
              </button>
            </form>

            <div className="help-section">
              <h3>Need Help?</h3>
              <div className="help-items">
                <div className="help-item">
                  <strong>Meeting ID:</strong> An alphanumeric code (e.g., ABC-123-DEF)
                </div>
                <div className="help-item">
                  <strong>Password:</strong> Provided by the meeting organizer
                </div>
                <div className="help-item">
                  <strong>Having trouble?</strong> Contact the meeting organizer or our support team
                </div>
              </div>
            </div>
          </div>

          <div className="join-info">
            <h2>🚀 Quick & Easy Meeting Access</h2>
            <div className="features">
              <div className="feature">
                <div className="feature-icon">🌐</div>
                <div>
                  <h4>Join from Anywhere</h4>
                  <p>Access meetings globally from any device with internet connection</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🔒</div>
                <div>
                  <h4>Secure & Private</h4>
                  <p>All meetings are password protected with enterprise-grade security</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">⚡</div>
                <div>
                  <h4>Instant Access</h4>
                  <p>Join meetings in seconds without downloads or installations</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🎯</div>
                <div>
                  <h4>Full Featured</h4>
                  <p>Enjoy HD video, crystal clear audio, screen sharing, and chat</p>
                </div>
              </div>
            </div>

            <div className="cta-section">
              {user ? (
                <>
                  <p>Welcome back, {user.firstName || user.email}!</p>
                  <div className="user-status">
                    <span className="status-icon">✅</span>
                    <span>Ready to join meetings</span>
                  </div>
                </>
              ) : (
                <>
                  <p>Don't have an account?</p>
                  <button 
                    className="signup-btn"
                    onClick={() => navigate('/signup')}
                  >
                    Sign Up Free
                  </button>
                  <div className="login-link">
                    <span>Already have an account? </span>
                    <button 
                      className="login-link-btn"
                      onClick={() => navigate('/login')}
                    >
                      Login here
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default JoinMeeting;