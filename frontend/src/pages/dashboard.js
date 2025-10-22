import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaVideo, FaPlus, FaCalendar, FaClock, FaUsers, FaCopy, FaPlay, FaShare, 
  FaChartLine, FaList, FaArrowUp, FaEye, FaMicrophone, FaDesktop,
  FaSun, FaMoon, FaBell, FaFilter, FaSearch, FaDownload, FaHeart
} from 'react-icons/fa';
import Header from "../components/header";
import Footer from "../components/footer";
import Calendar from "../components/Calendar";
import MeetingLinkShare from "../components/MeetingLinkShare";
import MeetingDetailModal from "../components/MeetingDetailModal";
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useTheme } from '../contexts/ThemeContext';
import { buildApiUrl } from '../config/api';
import sessionManager, { IsolatedSocket, IsolatedPeer } from '../utils/sessionIsolation';
import './dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isHeaderVisible } = useUI();
  const { isDarkMode, toggleTheme } = useTheme();
  
  // Meeting form states
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [settings, setSettings] = useState({
    allowScreenShare: true,
    allowChat: true,
    allowRecording: true,
    waitingRoom: false,
    muteOnEntry: false
  });
  
  // Data and UI states
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [shareModalData, setShareModalData] = useState({ isOpen: false, meeting: null });
  const [meetingDetailModal, setMeetingDetailModal] = useState({ isOpen: false, meeting: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Meeting overlay functionality removed - now using proper join flow
  
  // Notification states
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifiedMeetings, setNotifiedMeetings] = useState(new Set());
  const [recentActivity, setRecentActivity] = useState([
    { type: 'meeting_created', title: 'Team Standup', time: '2 hours ago', icon: FaPlus },
    { type: 'meeting_joined', title: 'Client Review', time: '1 day ago', icon: FaVideo },
    { type: 'meeting_shared', title: 'Product Demo', time: '2 days ago', icon: FaShare }
  ]);
  
  const userEmail = user?.email || localStorage.getItem("email");

  // Initialize session manager when component mounts
  useEffect(() => {
    if (userEmail) {
      console.log('Dashboard initialized with session isolation for user:', userEmail);
      console.log('Session ID:', sessionManager.sessionId);
    }
    
    // Cleanup on unmount
    return () => {
      if (userEmail) {
        console.log('Dashboard unmounting - cleaning up all sessions for user:', userEmail);
        sessionManager.cleanup();
      }
    };
  }, [userEmail]);

  // Calculate stats from local meetings data with trends
  const calculateLocalStats = React.useCallback(() => {
    console.log('Calculating stats from meetings:', meetings.length);
    
    if (meetings.length === 0) {
      setStats({
        totalMeetings: 0,
        scheduledMeetings: 0,
        averageParticipants: 0,
        totalDuration: 0,
        trends: {
          totalMeetingsTrend: 0,
          scheduledMeetingsTrend: 0,
          averageParticipantsTrend: 0,
          totalDurationTrend: 0
        }
      });
      return;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    // Current period (last 30 days)
    let totalMeetings = meetings.length;
    let scheduledMeetings = 0;
    let totalParticipants = 0;
    let totalDuration = 0;
    let currentPeriodMeetings = 0;
    let currentPeriodDuration = 0;
    let currentPeriodParticipants = 0;
    
    // Previous period (30-60 days ago)
    let previousPeriodMeetings = 0;
    let previousPeriodDuration = 0;
    let previousPeriodParticipants = 0;

    meetings.forEach(meeting => {
      const meetingDate = new Date(meeting.scheduledAt);
      const createdDate = new Date(meeting.createdAt || meeting.scheduledAt);
      
      // Count scheduled (upcoming) meetings
      if (meetingDate > now && meeting.status !== 'ended') {
        scheduledMeetings++;
      }
      
      // Count participants
      const participantCount = meeting.participants?.length || 1;
      totalParticipants += participantCount;
      
      // Calculate duration for completed meetings
      let actualMinutes = 0;
      const isCompleted = meeting.status === 'ended' || meeting.status === 'completed' || 
                         (meeting.endTime && new Date(meeting.endTime) < now);
      
      if (isCompleted) {
        if (meeting.actualDuration) {
          actualMinutes = meeting.actualDuration;
        } else if (meeting.endTime && (meeting.startTime || meeting.joinedAt)) {
          const startTime = new Date(meeting.startTime || meeting.joinedAt || meeting.scheduledAt);
          const endTime = new Date(meeting.endTime);
          actualMinutes = Math.max(0, (endTime.getTime() - startTime.getTime()) / (1000 * 60));
        } else if (meeting.duration && meeting.status === 'ended') {
          actualMinutes = typeof meeting.duration === 'number' && meeting.duration > 1000 
            ? meeting.duration / (1000 * 60)
            : meeting.duration;
        }
        
        if (actualMinutes > 0) {
          totalDuration += actualMinutes;
        }
      }
      
      // Categorize by time periods for trend calculation
      if (createdDate >= thirtyDaysAgo) {
        // Current period (last 30 days)
        currentPeriodMeetings++;
        currentPeriodParticipants += participantCount;
        if (actualMinutes > 0) {
          currentPeriodDuration += actualMinutes;
        }
      } else if (createdDate >= sixtyDaysAgo) {
        // Previous period (30-60 days ago)
        previousPeriodMeetings++;
        previousPeriodParticipants += participantCount;
        if (actualMinutes > 0) {
          previousPeriodDuration += actualMinutes;
        }
      }
    });

    const averageParticipants = totalMeetings > 0 ? totalParticipants / totalMeetings : 0;
    
    // Calculate trends (percentage change from previous period)
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    const trends = {
      totalMeetingsTrend: calculateTrend(currentPeriodMeetings, previousPeriodMeetings),
      scheduledMeetingsTrend: calculateTrend(
        scheduledMeetings, 
        Math.max(1, Math.floor(scheduledMeetings * 0.8)) // Estimate previous scheduled
      ),
      averageParticipantsTrend: calculateTrend(
        currentPeriodMeetings > 0 ? currentPeriodParticipants / currentPeriodMeetings : 0,
        previousPeriodMeetings > 0 ? previousPeriodParticipants / previousPeriodMeetings : 0
      ),
      totalDurationTrend: calculateTrend(currentPeriodDuration, previousPeriodDuration)
    };

    const calculatedStats = {
      totalMeetings,
      scheduledMeetings,
      averageParticipants,
      totalDuration,
      trends
    };
    
    console.log('Final calculated stats with trends:', {
      ...calculatedStats,
      totalMinutes: Math.round(totalDuration),
      completedMeetings: meetings.filter(m => m.status === 'ended' || m.endTime).length,
      currentPeriod: { meetings: currentPeriodMeetings, duration: currentPeriodDuration },
      previousPeriod: { meetings: previousPeriodMeetings, duration: previousPeriodDuration }
    });
    
    setStats(calculatedStats);
  }, [meetings]);


  useEffect(() => {
    if (userEmail) {
      fetchMeetings();
      fetchStats();
      // Request notification permission
      requestNotificationPermission();
    }
  }, [userEmail]);

  // Recalculate stats when meetings data changes
  useEffect(() => {
    if (meetings.length >= 0) { // Changed to >= 0 to handle empty state
      calculateLocalStats();
      updateRecentActivity();
    }
  }, [meetings, calculateLocalStats]);

  // Update recent activity based on meetings data
  const updateRecentActivity = () => {
    const activities = [];
    const now = new Date();
    
    // Get recent meetings (created in last 7 days)
    const recentMeetings = meetings
      .filter(meeting => {
        const createdDate = new Date(meeting.createdAt || meeting.scheduledAt);
        const daysDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      })
      .sort((a, b) => new Date(b.createdAt || b.scheduledAt) - new Date(a.createdAt || a.scheduledAt))
      .slice(0, 5);
    
    recentMeetings.forEach(meeting => {
      const createdDate = new Date(meeting.createdAt || meeting.scheduledAt);
      const timeDiff = now.getTime() - createdDate.getTime();
      const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursDiff = Math.floor(timeDiff / (1000 * 60 * 60));
      
      let timeAgo;
      if (daysDiff > 0) {
        timeAgo = daysDiff === 1 ? '1 day ago' : `${daysDiff} days ago`;
      } else if (hoursDiff > 0) {
        timeAgo = hoursDiff === 1 ? '1 hour ago' : `${hoursDiff} hours ago`;
      } else {
        timeAgo = 'Just now';
      }
      
      let activityType = 'meeting_created';
      let icon = FaPlus;
      
      if (meeting.status === 'ended') {
        activityType = 'meeting_ended';
        icon = FaVideo;
      } else if (meeting.status === 'active') {
        activityType = 'meeting_active';
        icon = FaVideo;
      }
      
      activities.push({
        type: activityType,
        title: meeting.title,
        time: timeAgo,
        icon: icon,
        meetingId: meeting.meetingId
      });
    });
    
    // Add default activities if no recent meetings
    if (activities.length === 0) {
      activities.push(
        { type: 'welcome', title: 'Welcome to JointRight!', time: 'Getting started', icon: FaVideo },
        { type: 'feature', title: 'Create your first meeting', time: 'Quick start', icon: FaPlus },
        { type: 'feature', title: 'Schedule meetings easily', time: 'Pro tip', icon: FaCalendar }
      );
    }
    
    setRecentActivity(activities);
  };

  // Check for upcoming meetings and create notifications
  useEffect(() => {
    if (meetings.length > 0) {
      checkUpcomingMeetings();
      // Set up interval to check notifications every minute
      const interval = setInterval(checkUpcomingMeetings, 60000);
      return () => clearInterval(interval);
    }
  }, [meetings, notifiedMeetings]);

  // Click outside handler for notifications dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.notification-wrapper')) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showNotifications]);

  const fetchMeetings = async () => {
    if (!userEmail) return;
    
    try {
      const res = await fetch(buildApiUrl(`/api/meetings/user/${userEmail}`));
      const data = await res.json();
      if (res.ok) {
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const fetchStats = async () => {
    if (!userEmail) return;
    
    try {
      const res = await fetch(buildApiUrl(`/api/meetings/user/${userEmail}/stats`));
      const data = await res.json();
      if (res.ok && data.stats) {
        setStats(data.stats);
      } else {
        // Fallback: calculate stats from meetings data
        calculateLocalStats();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Fallback: calculate stats from meetings data
      calculateLocalStats();
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const sendBrowserNotification = (meeting) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const meetingTime = new Date(meeting.scheduledAt);
      const now = new Date();
      const minutesUntil = Math.floor((meetingTime.getTime() - now.getTime()) / (1000 * 60));
      
      const notification = new Notification(`Meeting Starting Soon: ${meeting.title}`, {
        body: `Your meeting starts in ${minutesUntil} minutes at ${meetingTime.toLocaleTimeString()}. Click to join!`,
        icon: '/favicon.ico',
        tag: `meeting-${meeting._id}`,
        requireInteraction: false,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        // Bring the browser window to front
        if (window.parent) {
          window.parent.focus();
        }
        joinMeeting(meeting.meetingId);
        notification.close();
      };

      // Auto close after 15 seconds
      setTimeout(() => {
        notification.close();
      }, 15000);
      
      // Optional: Play a subtle sound (you can add this if needed)
      // const audio = new Audio('/notification-sound.mp3');
      // audio.play().catch(() => {}); // Ignore errors if sound fails
    }
  };

  const checkUpcomingMeetings = () => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    
    const upcomingNotifications = [];
    
    meetings.forEach(meeting => {
      const meetingTime = new Date(meeting.scheduledAt);
      const timeDiff = meetingTime.getTime() - now.getTime();
      const minutesUntilMeeting = Math.floor(timeDiff / (1000 * 60));
      
      // Check if meeting is within 1 hour and not already notified
      if (minutesUntilMeeting > 0 && minutesUntilMeeting <= 60 && !notifiedMeetings.has(meeting._id)) {
        const notification = {
          id: meeting._id,
          type: 'meeting-reminder',
          title: `Meeting starting in ${minutesUntilMeeting} minutes`,
          message: `"${meeting.title}" is scheduled to start at ${meetingTime.toLocaleTimeString()}`,
          meeting: meeting,
          time: now.toISOString(),
          read: false,
          minutesUntil: minutesUntilMeeting
        };
        
        upcomingNotifications.push(notification);
        
        // Send browser notification
        sendBrowserNotification(meeting);
        
        // Mark as notified
        setNotifiedMeetings(prev => new Set([...prev, meeting._id]));
      }
    });
    
    if (upcomingNotifications.length > 0) {
      setNotifications(prev => [...upcomingNotifications, ...prev]);
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  const getUnreadNotificationCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  const handleCreate = async (selectedDate = null) => {
    // Enhanced form validation
    const validationErrors = [];
    
    if (!userEmail) {
      validationErrors.push("User email is required. Please log in again.");
    }
    
    if (!title || title.trim().length === 0) {
      validationErrors.push("Meeting title is required");
    }
    
    if (!password || password.trim().length === 0) {
      validationErrors.push("Meeting password is required");
    }
    
    if (!scheduledAt) {
      validationErrors.push("Schedule time is required");
    } else {
      const scheduleDate = new Date(scheduledAt);
      const now = new Date();
      
      // Allow meetings to be scheduled up to 10 minutes in the past for immediate meetings
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      
      if (scheduleDate < tenMinutesAgo) {
        validationErrors.push("Meeting time cannot be more than 10 minutes in the past");
      }
    }
    
    if (validationErrors.length > 0) {
      alert("Please fix the following errors:\n\n" + validationErrors.join("\n"));
      return;
    }

    setIsLoading(true);
    try {
      // Create isolated session context for meeting creation
      const sessionContext = sessionManager.createUserContext(userEmail, 'meeting-creation');
      
      const apiUrl = buildApiUrl("/api/meetings/create");
      const requestBody = {
        title: title.trim(), 
        password: password.trim(), 
        description: description ? description.trim() : '',
        scheduledAt, 
        creator: userEmail,
        settings,
        sessionId: sessionManager.sessionId // Include session ID in request
      };
      
      console.log('Creating meeting with URL:', apiUrl);
      console.log('Request body:', requestBody);
      console.log('User email:', userEmail);
      
      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Session-ID": sessionManager.sessionId // Add session ID to headers
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);
      
      if (!res.ok) {
        console.error('HTTP Error:', res.status, res.statusText);
        throw new Error(`HTTP Error: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      console.log('Response data:', data);
      
      if (data.success) {
        // Show share modal instead of simple alert
        setMeetings(prev => [...prev, data.meeting]);
        setShareModalData({ isOpen: true, meeting: data.meeting });
        setShowCreateModal(false);
        resetForm();
        
        // Clean up temporary session context
        sessionManager.cleanupUserContext(userEmail, 'meeting-creation');
        
        console.log('Meeting created successfully with session isolation');
        // Stats will be automatically updated via useEffect
      } else {
        alert(data.error || 'Error creating meeting');
      }
    } catch (error) {
      console.error('Create meeting error:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error message
      let errorMessage = 'Error creating meeting. ';
      if (error.message.includes('Failed to fetch')) {
        errorMessage += 'Cannot connect to server. Please check if backend is running on port 5000.';
      } else if (error.message.includes('HTTP Error')) {
        errorMessage += `Server error: ${error.message}`;
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      alert(errorMessage);
    }
    setIsLoading(false);
  };


  const resetForm = () => {
    setTitle('');
    setPassword('');
    setDescription('');
    setScheduledAt('');
    setSettings({
      allowScreenShare: true,
      allowChat: true,
      allowRecording: true,
      waitingRoom: false,
      muteOnEntry: false
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const joinMeeting = (meeting) => {
    // Store meeting data for proper join flow
    const meetingData = {
      meetingId: meeting.meetingId,
      password: meeting.password,
      title: meeting.title,
      host: meeting.creator
    };
    
    // Navigate to proper join flow with meeting data
    navigate('/join', {
      state: {
        meetingData,
        prefilledData: meetingData
      }
    });
  };

  const shareMeeting = (meeting) => {
    setShareModalData({ isOpen: true, meeting });
  };

  const handleCreateMeeting = (selectedDate = null) => {
    if (selectedDate) {
      // Pre-fill the date if called from calendar
      const dateTime = new Date(selectedDate);
      dateTime.setHours(new Date().getHours() + 1, 0, 0, 0); // Set to next hour
      setScheduledAt(dateTime.toISOString().slice(0, 16));
    } else {
      // Set default time to 1 hour from now if no date provided
      const defaultTime = new Date();
      defaultTime.setHours(defaultTime.getHours() + 1, 0, 0, 0);
      setScheduledAt(defaultTime.toISOString().slice(0, 16));
    }
    setShowCreateModal(true);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };


  // Lock/unlock body scroll when modal is open
  useEffect(() => {
    if (showCreateModal || shareModalData.isOpen || meetingDetailModal.isOpen) {
      document.body.classList.add('modal-open');
      // Prevent background scroll on mobile
      const scrollY = window.scrollY;
      document.body.style.top = `-${scrollY}px`;
    } else {
      document.body.classList.remove('modal-open');
      // Restore scroll position
      const scrollY = document.body.style.top;
      document.body.style.top = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
    };
  }, [showCreateModal, shareModalData.isOpen, meetingDetailModal.isOpen]);

  const getFilteredMeetings = (filter = null) => {
    const now = new Date();
    const filterType = filter || (activeTab === 'meetings' ? 'all' : activeTab);
    
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.scheduledAt);
      
      // Status filter
      let statusMatch = true;
      switch (statusFilter) {
        case 'upcoming':
          statusMatch = meetingDate > now && meeting.status !== 'ended';
          break;
        case 'past':
          statusMatch = meetingDate <= now || meeting.status === 'ended';
          break;
        case 'active':
          statusMatch = meeting.status === 'active';
          break;
        default:
          statusMatch = true;
      }
      
      // Search filter
      const searchMatch = !searchQuery || 
        meeting.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (meeting.description && meeting.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Date filter for activeTab
      let dateMatch = true;
      switch (filterType) {
        case 'upcoming':
          dateMatch = meetingDate > now && meeting.status !== 'ended';
          break;
        case 'past':
          dateMatch = meetingDate <= now || meeting.status === 'ended';
          break;
        default:
          dateMatch = true;
      }
      
      return statusMatch && searchMatch && dateMatch;
    }).sort((a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
  };

  // If user is not authenticated, show guest dashboard
  if (!isAuthenticated) {
    return (
      <div className="dashboard guest-dashboard">
        {isHeaderVisible && <Header />}
        <div className="guest-dashboard-container">
          <div className="guest-hero">
            <div className="hero-content">
              <h1>Welcome to JointRight</h1>
              <p className="hero-subtitle">
                Your gateway to seamless video conferencing and collaboration
              </p>
              <div className="guest-stats">
                <div className="guest-stat">
                  <div className="stat-icon">
                    <FaVideo />
                  </div>
                  <div className="stat-text">
                    <span className="stat-number">HD Quality</span>
                    <span className="stat-label">Video Calls</span>
                  </div>
                </div>
                <div className="guest-stat">
                  <div className="stat-icon">
                    <FaUsers />
                  </div>
                  <div className="stat-text">
                    <span className="stat-number">Unlimited</span>
                    <span className="stat-label">Participants</span>
                  </div>
                </div>
                <div className="guest-stat">
                  <div className="stat-icon">
                    <FaClock />
                  </div>
                  <div className="stat-text">
                    <span className="stat-number">24/7</span>
                    <span className="stat-label">Availability</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="guest-features">
            <h2>What You Get with JointRight</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <FaVideo />
                </div>
                <h3>HD Video Conferencing</h3>
                <p>Crystal clear video calls with adaptive quality based on your connection</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaDesktop />
                </div>
                <h3>Screen Sharing</h3>
                <p>Share your screen, presentations, and applications seamlessly</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaCalendar />
                </div>
                <h3>Meeting Scheduling</h3>
                <p>Schedule meetings in advance with calendar integration</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <FaMicrophone />
                </div>
                <h3>Clear Audio</h3>
                <p>High-quality audio with noise cancellation technology</p>
              </div>
            </div>
          </div>
          
          <div className="guest-cta">
            <div className="cta-content">
              <h2>Ready to Start Your Journey?</h2>
              <p>Join thousands of users who trust JointRight for their video conferencing needs</p>
              <div className="cta-buttons">
                <button 
                  className="cta-btn primary"
                  onClick={() => navigate('/signup')}
                >
                  <FaPlus /> Get Started
                </button>
                <button 
                  className="cta-btn secondary"
                  onClick={() => navigate('/login')}
                >
                  <FaVideo /> Sign In
                </button>
              </div>
              <div className="login-prompt">
                <p>Want to try joining a meeting first?</p>
                <button 
                  className="join-meeting-btn"
                  onClick={() => navigate('/join')}
                >
                  Join a Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Check if any modal is open
  const isAnyModalOpen = showCreateModal || shareModalData.isOpen || meetingDetailModal.isOpen;
  
  return (
    <div className={`dashboard ${isDarkMode ? 'dark-mode' : ''}`}>
      {isHeaderVisible && !isAnyModalOpen && <Header />}
      <div className="dashboard-container">
        {/* Enhanced Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div className="header-main">
              <div className="header-text">
                <h1>Dashboard</h1>
                <p>Welcome back, {user?.firstName ? `${user.firstName} ${user.lastName}` : userEmail}</p>
                <span className="current-time">{new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</span>
              </div>
              <div className="header-controls">
                <div className="notification-wrapper">
                  <button 
                    className="control-btn notification-btn"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <FaBell />
                    {getUnreadNotificationCount() > 0 && (
                      <span className="notification-badge">{getUnreadNotificationCount()}</span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="notifications-dropdown">
                      <div className="notifications-header">
                        <h3>Notifications</h3>
                        {notifications.length > 0 && (
                          <button 
                            className="clear-all-btn"
                            onClick={clearAllNotifications}
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                      
                      <div className="notifications-list">
                        {notifications.length === 0 ? (
                          <div className="no-notifications">
                            <FaBell style={{ opacity: 0.5, fontSize: '2rem', marginBottom: '10px' }} />
                            <p>No notifications</p>
                          </div>
                        ) : (
                          notifications.slice(0, 10).map(notification => (
                            <div 
                              key={notification.id}
                              className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                              onClick={() => {
                                markNotificationAsRead(notification.id);
                                if (notification.meeting) {
                                  joinMeeting(notification.meeting);
                                }
                              }}
                            >
                              <div className="notification-icon">
                                {notification.minutesUntil <= 15 ? (
                                  <FaClock style={{ color: '#ef4444' }} />
                                ) : notification.minutesUntil <= 30 ? (
                                  <FaClock style={{ color: '#f59e0b' }} />
                                ) : (
                                  <FaClock style={{ color: '#3b82f6' }} />
                                )}
                              </div>
                              <div className="notification-content">
                                <div className="notification-title">{notification.title}</div>
                                <div className="notification-message">{notification.message}</div>
                                <div className="notification-time">
                                  {new Date(notification.time).toLocaleTimeString()}
                                </div>
                              </div>
                              {!notification.read && <div className="unread-dot"></div>}
                            </div>
                          ))
                        )}
                      </div>
                      
                      {notifications.length > 10 && (
                        <div className="notifications-footer">
                          <p>{notifications.length - 10} more notifications...</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <button className="control-btn theme-btn" onClick={toggleTheme}>
                  {isDarkMode ? <FaSun /> : <FaMoon />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Section */}
        {stats && (
          <div className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon meetings-icon">
                  <FaVideo />
                </div>
                <div className="stat-content">
                  <span className="stat-number">{stats.totalMeetings || 0}</span>
                  <span className="stat-label">Total Meetings</span>
                  <div className="stat-trend">
                    {stats.trends?.totalMeetingsTrend >= 0 ? (
                      <FaArrowUp className="trend-icon positive" />
                    ) : (
                      <FaArrowUp className="trend-icon negative" style={{ transform: 'rotate(180deg)' }} />
                    )}
                    <span className="trend-text">
                      {stats.trends?.totalMeetingsTrend >= 0 ? '+' : ''}{stats.trends?.totalMeetingsTrend || 0}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon scheduled-icon">
                  <FaCalendar />
                </div>
                <div className="stat-content">
                  <span className="stat-number">{stats.scheduledMeetings || 0}</span>
                  <span className="stat-label">Scheduled</span>
                  <div className="stat-trend">
                    {stats.trends?.scheduledMeetingsTrend >= 0 ? (
                      <FaArrowUp className="trend-icon positive" />
                    ) : (
                      <FaArrowUp className="trend-icon negative" style={{ transform: 'rotate(180deg)' }} />
                    )}
                    <span className="trend-text">
                      {stats.trends?.scheduledMeetingsTrend >= 0 ? '+' : ''}{stats.trends?.scheduledMeetingsTrend || 0}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon participants-icon">
                  <FaUsers />
                </div>
                <div className="stat-content">
                  <span className="stat-number">{Math.round(stats.averageParticipants || 0)}</span>
                  <span className="stat-label">Avg Participants</span>
                  <div className="stat-trend">
                    {stats.trends?.averageParticipantsTrend >= 0 ? (
                      <FaArrowUp className="trend-icon positive" />
                    ) : (
                      <FaArrowUp className="trend-icon negative" style={{ transform: 'rotate(180deg)' }} />
                    )}
                    <span className="trend-text">
                      {stats.trends?.averageParticipantsTrend >= 0 ? '+' : ''}{stats.trends?.averageParticipantsTrend || 0}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon duration-icon">
                  <FaClock />
                </div>
                <div className="stat-content">
                  <span className="stat-number">{Math.round(stats.totalDuration || 0)}</span>
                  <span className="stat-label">Total Minutes</span>
                  <div className="stat-trend">
                    {stats.trends?.totalDurationTrend >= 0 ? (
                      <FaArrowUp className="trend-icon positive" />
                    ) : (
                      <FaArrowUp className="trend-icon negative" style={{ transform: 'rotate(180deg)' }} />
                    )}
                    <span className="trend-text">
                      {stats.trends?.totalDurationTrend >= 0 ? '+' : ''}{stats.trends?.totalDurationTrend || 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Navigation Tabs */}
        <div className="dashboard-navigation">
          <div className="dashboard-tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <div className="tab-icon">
                <FaChartLine />
              </div>
              <span className="tab-text">Overview</span>
              {activeTab === 'overview' && <div className="tab-indicator" />}
            </button>
            <button 
              className={`tab ${activeTab === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveTab('calendar')}
            >
              <div className="tab-icon">
                <FaCalendar />
              </div>
              <span className="tab-text">Calendar</span>
              {activeTab === 'calendar' && <div className="tab-indicator" />}
            </button>
            <button 
              className={`tab ${activeTab === 'meetings' ? 'active' : ''}`}
              onClick={() => setActiveTab('meetings')}
            >
              <div className="tab-icon">
                <FaList />
              </div>
              <span className="tab-text">All Meetings</span>
              {activeTab === 'meetings' && <div className="tab-indicator" />}
            </button>
          </div>
          
          {/* Search and Filters (shown on meetings tab) */}
          {activeTab === 'meetings' && (
            <div className="tab-controls">
              <div className="search-container">
                <FaSearch className="search-icon" />
                <input 
                  type="text"
                  placeholder="Search meetings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-container">
                <FaFilter className="filter-icon" />
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="past">Past</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="dashboard-content">
          {activeTab === 'overview' && (
            <div className="overview-section">
              {/* Quick Actions */}
              <div className="quick-actions">
                <button 
                  className="action-btn primary"
                  onClick={() => handleCreateMeeting()}
                  disabled={isLoading}
                >
                  <FaPlus /> 
                  <span>New Meeting</span>
                </button>
                <button 
                  className="action-btn secondary"
                  onClick={() => navigate('/join')}
                >
                  <FaVideo /> 
                  <span>Join Meeting</span>
                </button>
                <button 
                  className="action-btn tertiary"
                  onClick={() => setActiveTab('calendar')}
                >
                  <FaCalendar /> 
                  <span>Schedule</span>
                </button>
              </div>
              
              {/* Dashboard Widgets */}
              <div className="dashboard-widgets">
                {/* Upcoming Meetings Widget */}
                <div className="widget upcoming-widget">
                  <div className="widget-header">
                    <h3><FaClock className="widget-icon" /> Upcoming Meetings</h3>
                    <button 
                      className="widget-action"
                      onClick={() => setActiveTab('meetings')}
                    >
                      View All
                    </button>
                  </div>
                  <div className="widget-content">
                    {getFilteredMeetings('upcoming').length === 0 ? (
                      <div className="widget-empty">
                        <FaCalendar className="empty-icon" />
                        <p>No upcoming meetings</p>
                        <button 
                          className="empty-action"
                          onClick={() => handleCreateMeeting()}
                        >
                          Create your first meeting
                        </button>
                      </div>
                    ) : (
                      getFilteredMeetings('upcoming')
                        .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)) // Sort by soonest first
                        .slice(0, 4).map((meeting) => {
                        const meetingDate = new Date(meeting.scheduledAt);
                        const now = new Date();
                        const timeDiff = meetingDate.getTime() - now.getTime();
                        const minutesUntil = Math.floor(timeDiff / (1000 * 60));
                        const hoursUntil = Math.floor(timeDiff / (1000 * 60 * 60));
                        const daysUntil = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                        
                        let timeUntilText = '';
                        let urgencyClass = '';
                        
                        if (daysUntil > 0) {
                          timeUntilText = `${daysUntil} day${daysUntil > 1 ? 's' : ''}`;
                          urgencyClass = 'upcoming';
                        } else if (hoursUntil > 0) {
                          timeUntilText = `${hoursUntil} hour${hoursUntil > 1 ? 's' : ''}`;
                          urgencyClass = hoursUntil <= 2 ? 'soon' : 'upcoming';
                        } else if (minutesUntil > 0) {
                          timeUntilText = `${minutesUntil} min`;
                          urgencyClass = minutesUntil <= 15 ? 'urgent' : 'soon';
                        } else {
                          timeUntilText = 'Starting now';
                          urgencyClass = 'urgent';
                        }
                        
                        const isToday = meetingDate.toDateString() === now.toDateString();
                        const canJoin = minutesUntil <= 5 && minutesUntil >= -30; // Can join 5 min before to 30 min after
                        
                        return (
                          <div key={meeting._id} className={`meeting-item enhanced ${urgencyClass} ${isToday ? 'today' : ''}`}>
                            <div className="meeting-status">
                              <div className={`meeting-time-badge ${urgencyClass}`}>
                                <div className="badge-date">
                                  {meetingDate.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric' 
                                  })}
                                </div>
                                <div className="badge-time">
                                  {meetingDate.toLocaleTimeString('en-US', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </div>
                              </div>
                              <div className={`time-until ${urgencyClass}`}>
                                <FaClock className="clock-icon" />
                                <span>{timeUntilText}</span>
                              </div>
                            </div>
                            
                            <div className="meeting-details enhanced">
                              <h4 className="meeting-title-enhanced">{meeting.title}</h4>
                              {meeting.description && (
                                <p className="meeting-description-preview">
                                  {meeting.description.length > 50 
                                    ? meeting.description.substring(0, 50) + '...' 
                                    : meeting.description}
                                </p>
                              )}
                              <div className="meeting-meta">
                                <span className="participants-count">
                                  <FaUsers className="meta-icon" /> 
                                  {meeting.participants?.length || 0} participants
                                </span>
                                {meeting.settings?.allowRecording && (
                                  <span className="recording-indicator">
                                    <FaEye className="meta-icon" /> Recording
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="meeting-quick-actions enhanced">
                              {canJoin && (
                                <button 
                                  className="quick-btn join-btn-enhanced primary"
                                  onClick={() => joinMeeting(meeting)}
                                  title="Join Meeting"
                                >
                                  <FaVideo className="btn-icon" />
                                  <span>Join Now</span>
                                </button>
                              )}
                              <button 
                                className="quick-btn share-btn"
                                onClick={() => shareMeeting(meeting)}
                                title="Share Meeting"
                              >
                                <FaShare />
                              </button>
                              <button 
                                className="quick-btn info-btn"
                                onClick={() => {
                                  setMeetingDetailModal({ isOpen: true, meeting });
                                }}
                                title="Meeting Details"
                              >
                                <FaEye />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                
                {/* Recent Activity Widget */}
                <div className="widget activity-widget">
                  <div className="widget-header">
                    <h3><FaBell className="widget-icon" /> Recent Activity</h3>
                  </div>
                  <div className="widget-content">
                    {recentActivity.map((activity, index) => {
                      const IconComponent = activity.icon;
                      return (
                        <div key={index} className="activity-item">
                          <div className={`activity-icon ${activity.type}`}>
                            <IconComponent />
                          </div>
                          <div className="activity-details">
                            <p className="activity-title">{activity.title}</p>
                            <span className="activity-time">{activity.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Quick Stats Widget */}
                <div className="widget stats-widget">
                  <div className="widget-header">
                    <h3><FaChartLine className="widget-icon" /> Quick Stats</h3>
                  </div>
                  <div className="widget-content">
                    <div className="mini-stats">
                      <div className="mini-stat clickable" onClick={() => setActiveTab('meetings')}>
                        <div className="mini-stat-icon today">
                          <FaVideo />
                        </div>
                        <div className="mini-stat-info">
                          <span className="mini-stat-number">
                            {getFilteredMeetings().filter(m => {
                              const today = new Date();
                              const meetingDate = new Date(m.scheduledAt);
                              return meetingDate.toDateString() === today.toDateString();
                            }).length}
                          </span>
                          <span className="mini-stat-label">Today's Meetings</span>
                          <span className="mini-stat-trend">Click to view all</span>
                        </div>
                      </div>
                      
                      <div className="mini-stat clickable" onClick={() => setActiveTab('calendar')}>
                        <div className="mini-stat-icon week">
                          <FaCalendar />
                        </div>
                        <div className="mini-stat-info">
                          <span className="mini-stat-number">
                            {getFilteredMeetings('upcoming').length}
                          </span>
                          <span className="mini-stat-label">Upcoming</span>
                          <span className="mini-stat-trend">Next 7 days</span>
                        </div>
                      </div>
                      
                      <div className="mini-stat">
                        <div className="mini-stat-icon completed">
                          <FaClock />
                        </div>
                        <div className="mini-stat-info">
                          <span className="mini-stat-number">
                            {meetings.filter(m => m.status === 'ended' || m.status === 'completed').length}
                          </span>
                          <span className="mini-stat-label">Completed</span>
                          <span className="mini-stat-trend">All time</span>
                        </div>
                      </div>
                      
                      <div className="mini-stat">
                        <div className="mini-stat-icon active">
                          <FaUsers />
                        </div>
                        <div className="mini-stat-info">
                          <span className="mini-stat-number">
                            {stats ? Math.round(stats.averageParticipants || 0) : 0}
                          </span>
                          <span className="mini-stat-label">Avg Participants</span>
                          <span className="mini-stat-trend">Per meeting</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'calendar' && (
            <Calendar 
              onCreateMeeting={handleCreateMeeting}
              onJoinMeeting={joinMeeting}
              userEmail={userEmail}
            />
          )}
          
          {activeTab === 'meetings' && (
            <div className="meetings-section">
              <div className="meetings-header">
                <h3>All Meetings</h3>
                <div className="meetings-controls">
                  <button 
                    className="create-btn"
                    onClick={() => handleCreateMeeting()}
                  >
                    <FaPlus /> Create Meeting
                  </button>
                </div>
              </div>
              
              <div className="meetings-list">
                {getFilteredMeetings().length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon-container">
                      <FaCalendar size={64} />
                    </div>
                    <h3>No meetings found</h3>
                    <p>Create your first meeting to get started with JointRight</p>
                    <button 
                      className="empty-cta"
                      onClick={() => handleCreateMeeting()}
                    >
                      <FaPlus /> Create Meeting
                    </button>
                  </div>
                ) : (
                  getFilteredMeetings().map((meeting) => {
                    const meetingDate = new Date(meeting.scheduledAt);
                    const isUpcoming = meetingDate > new Date();
                    const isToday = meetingDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div key={meeting._id} className={`meeting-card enhanced ${isToday ? 'today' : ''} ${isUpcoming ? 'upcoming' : 'past'}`}>
                        <div className="meeting-card-header">
                          <div className="meeting-status-indicator">
                            <div className={`status-dot ${meeting.status || 'scheduled'}`}></div>
                            <span className={`status-text ${meeting.status || 'scheduled'}`}>
                              {meeting.status || 'scheduled'}
                            </span>
                          </div>
                          <div className="meeting-date-badge">
                            <span className="date">
                              {meetingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="time">
                              {meetingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        
                        <div className="meeting-content">
                          <h4 className="meeting-title">{meeting.title}</h4>
                          {meeting.description && (
                            <p className="meeting-description">{meeting.description}</p>
                          )}
                          
                          <div className="meeting-details">
                            <div className="detail-item">
                              <FaUsers className="detail-icon" />
                              <span>{meeting.participants?.length || 0} participants</span>
                            </div>
                            <div className="detail-item">
                              <FaClock className="detail-icon" />
                              <span>{isToday ? 'Today' : meetingDate.toLocaleDateString()}</span>
                            </div>
                            {meeting.settings?.allowRecording && (
                              <div className="detail-item">
                                <FaEye className="detail-icon" />
                                <span>Recording enabled</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="meeting-actions-enhanced">
                          <div className="primary-actions">
                            <button 
                              className="btn-action primary"
                              onClick={() => joinMeeting(meeting)}
                              title="Join Meeting"
                            >
                              <FaPlay />
                              <span>Join</span>
                            </button>
                            <button 
                              className="btn-action secondary"
                              onClick={() => shareMeeting(meeting)}
                              title="Share Meeting"
                            >
                              <FaShare />
                              <span>Share</span>
                            </button>
                          </div>
                          
                          <div className="secondary-actions">
                            <button 
                              className="btn-icon"
                              onClick={() => copyToClipboard(meeting.link)}
                              title="Copy Link"
                            >
                              <FaCopy />
                            </button>
                            <button 
                              className="btn-icon"
                              onClick={() => {
                                // Download meeting info
                                const meetingInfo = `Meeting: ${meeting.title}\nDate: ${formatDate(meeting.scheduledAt)}\nLink: ${meeting.link}`;
                                const blob = new Blob([meetingInfo], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${meeting.title}-info.txt`;
                                a.click();
                              }}
                              title="Download Info"
                            >
                              <FaDownload />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Create Meeting Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>Create New Meeting</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowCreateModal(false)}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label>Meeting Title *</label>
                  <input 
                    type="text"
                    placeholder="Enter meeting title"
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea 
                    placeholder="Meeting description (optional)"
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input 
                    type="password"
                    placeholder="Meeting password"
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
                <div className="form-group">
                  <label>Schedule Time *</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledAt} 
                    onChange={(e) => setScheduledAt(e.target.value)} 
                  />
                </div>
                
                <div className="form-group">
                  <label>Meeting Settings</label>
                  <div className="settings-grid">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={settings.allowScreenShare}
                        onChange={(e) => setSettings({...settings, allowScreenShare: e.target.checked})}
                      />
                      Allow Screen Share
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={settings.allowChat}
                        onChange={(e) => setSettings({...settings, allowChat: e.target.checked})}
                      />
                      Allow Chat
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={settings.allowRecording}
                        onChange={(e) => setSettings({...settings, allowRecording: e.target.checked})}
                      />
                      Allow Recording
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={settings.waitingRoom}
                        onChange={(e) => setSettings({...settings, waitingRoom: e.target.checked})}
                      />
                      Enable Waiting Room
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox"
                        checked={settings.muteOnEntry}
                        onChange={(e) => setSettings({...settings, muteOnEntry: e.target.checked})}
                      />
                      Mute on Entry
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn-cancel"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  className="btn-create"
                  onClick={handleCreate}
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating...' : 'Create Meeting'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Share Meeting Modal */}
        <MeetingLinkShare 
          meeting={shareModalData.meeting}
          isOpen={shareModalData.isOpen}
          onClose={() => setShareModalData({ isOpen: false, meeting: null })}
        />
        
        {/* Meeting Detail Modal */}
        <MeetingDetailModal 
          meeting={meetingDetailModal.meeting}
          isOpen={meetingDetailModal.isOpen}
          onClose={() => setMeetingDetailModal({ isOpen: false, meeting: null })}
          onJoinMeeting={joinMeeting}
          onShareMeeting={shareMeeting}
        />
        
        
      </div>
      {!isAnyModalOpen && <Footer />}
    </div>
  );
};

export default Dashboard;
