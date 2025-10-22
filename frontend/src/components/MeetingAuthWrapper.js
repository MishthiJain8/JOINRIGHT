import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import JoinMeeting from '../pages/JoinMeeting';

const MeetingAuthWrapper = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { meetingId } = useParams();
  const { isAuthenticated, isLoading, user } = useAuth();
  const [meetingLinkData, setMeetingLinkData] = useState(null);

  useEffect(() => {
    // Parse meeting link data from URL
    const urlParams = new URLSearchParams(location.search);
    const password = urlParams.get('pwd');
    const meetingTitle = urlParams.get('title');
    const hostName = urlParams.get('host');
    
    const linkData = {
      meetingId: meetingId,
      password: password ? decodeURIComponent(password) : null,
      title: meetingTitle ? decodeURIComponent(meetingTitle) : null,
      host: hostName ? decodeURIComponent(hostName) : null,
      originalUrl: location.pathname + location.search
    };

    setMeetingLinkData(linkData);

    // Store meeting link data in sessionStorage for retrieval after login
    sessionStorage.setItem('pendingMeeting', JSON.stringify(linkData));

    console.log('📅 Meeting link accessed:', linkData);
  }, [meetingId, location.search, location.pathname]);

  useEffect(() => {
    // If not authenticated, redirect to login with return URL
    if (!isLoading && !isAuthenticated && meetingLinkData) {
      console.log('🔒 User not authenticated, redirecting to login');
      
      // Store the meeting link data and redirect to login
      const returnUrl = encodeURIComponent(meetingLinkData.originalUrl);
      navigate(`/login?returnUrl=${returnUrl}&type=meeting`, { replace: true });
    }
  }, [isAuthenticated, isLoading, meetingLinkData, navigate]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner}></div>
        <div style={loadingStyles.content}>
          <h2 style={loadingStyles.title}>Preparing Meeting Access</h2>
          <p style={loadingStyles.subtitle}>Please wait while we verify your credentials...</p>
        </div>
      </div>
    );
  }

  // Show loading while meeting data is being processed
  if (!meetingLinkData) {
    return (
      <div style={loadingStyles.container}>
        <div style={loadingStyles.spinner}></div>
        <div style={loadingStyles.content}>
          <h2 style={loadingStyles.title}>Loading Meeting</h2>
          <p style={loadingStyles.subtitle}>Processing meeting link...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the join meeting page
  if (isAuthenticated) {
    console.log('✅ User authenticated, showing join meeting page');
    return <JoinMeeting />;
  }

  // This shouldn't happen due to the redirect above, but as a fallback
  return (
    <div style={errorStyles.container}>
      <div style={errorStyles.content}>
        <h2 style={errorStyles.title}>🔒 Authentication Required</h2>
        <p style={errorStyles.subtitle}>
          You need to be logged in to join this meeting.
        </p>
        <button 
          style={errorStyles.button}
          onClick={() => navigate('/login')}
        >
          Go to Login
        </button>
      </div>
    </div>
  );
};

const loadingStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '20px',
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid rgba(255, 255, 255, 0.3)',
    borderTop: '4px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '30px',
  },
  content: {
    textAlign: 'center',
    maxWidth: '400px',
  },
  title: {
    fontSize: '1.8rem',
    fontWeight: '700',
    marginBottom: '12px',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  subtitle: {
    fontSize: '1.1rem',
    opacity: '0.9',
    lineHeight: '1.5',
    fontWeight: '400',
  },
};

const errorStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
  },
  content: {
    background: 'white',
    borderRadius: '20px',
    padding: '40px',
    textAlign: 'center',
    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: '15px',
  },
  subtitle: {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '25px',
    lineHeight: '1.5',
  },
  button: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
};

export default MeetingAuthWrapper;