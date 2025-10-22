import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileAPI } from '../services/api';
import Header from '../components/header';
import Footer from '../components/footer';
import { FaUser, FaEnvelope, FaPhone, FaBuilding, FaBriefcase, FaEdit, FaSave, FaTimes, FaCheck, FaCalendar, FaShieldAlt, FaStar, FaHistory, FaExclamationTriangle, FaSync, FaBell } from 'react-icons/fa';
import { io } from 'socket.io-client';
import CyberScoreBadge from '../components/CyberScoreBadge';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isLoading, updateUser } = useAuth();
  
  // Load complete profile data
  const loadProfileData = async () => {
    try {
      console.log('Loading complete profile data...');
      const response = await profileAPI.getUserProfile();
      if (response.success && response.user) {
        console.log('Profile data loaded:', response.user);
        console.log('User fields:', {
          createdAt: response.user.createdAt,
          emailVerified: response.user.emailVerified,
          isVerified: response.user.isVerified,
          isActive: response.user.isActive,
          phone: response.user.phone,
          bio: response.user.bio,
          company: response.user.company,
          position: response.user.position
        });
        // Update the auth context with complete user data
        updateUser(response.user);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };
  
  // Load cyber score data
  const loadCyberScore = async () => {
    if (!user?._id && !user?.id) {
      console.log('No user ID available for cyber score lookup');
      setIsLoadingCyberScore(false);
      return;
    }
    
    try {
      setIsLoadingCyberScore(true);
      const userId = user._id || user.id;
      
      console.log('Loading cyber score for user:', userId);
      
      // Fetch cyber score
      const scoreResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cyber-score/user/${userId}`);
      
      if (!scoreResponse.ok) {
        throw new Error(`HTTP error! status: ${scoreResponse.status}`);
      }
      
      const scoreData = await scoreResponse.json();
      
      if (scoreData.success) {
        console.log('Cyber score loaded successfully:', scoreData.cyberScore);
        setCyberScore(scoreData.cyberScore);
      } else {
        console.log('No cyber score found, using defaults');
        // User doesn't have a cyber score yet, set default
        setCyberScore({
          currentScore: 85,
          reputationLevel: 'good',
          meetingStats: {
            totalMeetingsAttended: 0,
            positiveReviews: 0,
            negativeReviews: 0
          },
          restrictions: {
            temporaryBan: { isActive: false }
          }
        });
      }
      
      // Fetch incident history (both positive and negative)
      try {
        const historyResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/cyber-score/history/${userId}?limit=20&type=all`);
        
        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          
          if (historyData.success) {
            console.log('History data loaded:', historyData);
            setIncidentHistory(historyData.history || []);
            // Also update the summary stats if available
            if (historyData.summary) {
              setCyberScore(prev => ({
                ...prev,
                historyStats: historyData.summary
              }));
            }
          }
        }
      } catch (historyError) {
        console.warn('Could not load incident history:', historyError);
        setIncidentHistory([]);
      }
    } catch (error) {
      console.error('Error loading cyber score:', error);
      // Set default values on error
      setCyberScore({
        currentScore: 85,
        reputationLevel: 'good',
        meetingStats: {
          totalMeetingsAttended: 0,
          positiveReviews: 0,
          negativeReviews: 0
        },
        restrictions: {
          temporaryBan: { isActive: false }
        }
      });
      setIncidentHistory([]);
    } finally {
      setIsLoadingCyberScore(false);
      setLastCyberScoreUpdate(Date.now());
    }
  };
  
  // Force refresh cyber score data
  const refreshCyberScore = async () => {
    console.log('Manually refreshing cyber score...');
    setCyberScore(null);
    setIncidentHistory([]);
    await loadCyberScore();
  };
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    company: '',
    position: ''
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  
  // Cyber Score State
  const [cyberScore, setCyberScore] = useState(null);
  const [incidentHistory, setIncidentHistory] = useState([]);
  const [isLoadingCyberScore, setIsLoadingCyberScore] = useState(true);
  const [showIncidentHistory, setShowIncidentHistory] = useState(false);
  const [lastCyberScoreUpdate, setLastCyberScoreUpdate] = useState(null);
  const [realtimeUpdates, setRealtimeUpdates] = useState(true);
  const [notifications, setNotifications] = useState([]);
  
  // Socket reference for real-time updates
  const socketRef = useRef(null);
  const pollIntervalRef = useRef(null);
  
  // Notification function - defined early to avoid hoisting issues
  const addNotification = useCallback((title, message, type = 'info') => {
    const notification = {
      id: Date.now(),
      title,
      message,
      type,
      timestamp: new Date()
    };
    
    setNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    
    // Auto remove after 10 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    }, 10000);
  }, []);
  
  // Handler functions - defined early to avoid hoisting issues
  const handleCyberScoreUpdate = useCallback((data) => {
    console.log('🎯 handleCyberScoreUpdate called with data:', data);
    const { previousScore, newScore, pointsChanged, reason, reputationLevel } = data;
    
    console.log(`📊 Updating cyber score: ${previousScore} → ${newScore} (${pointsChanged > 0 ? '+' : ''}${pointsChanged} points)`);
    
    // Update cyber score state
    setCyberScore(prev => {
      const updated = {
        ...prev,
        currentScore: newScore,
        reputationLevel: reputationLevel || prev.reputationLevel
      };
      console.log('✅ Cyber score state updated:', updated);
      return updated;
    });
    
    // Show notification
    const changeType = pointsChanged > 0 ? 'increase' : 'decrease';
    const changeText = pointsChanged > 0 ? '+' : '';
    console.log(`📢 Showing notification: ${changeType}`);
    
    addNotification(
      `Cyber Score ${changeType === 'increase' ? 'Increased' : 'Decreased'}!`,
      `Your score changed from ${previousScore} to ${newScore} (${changeText}${pointsChanged} points)${reason ? ' - ' + reason : ''}`,
      changeType === 'increase' ? 'success' : 'warning'
    );
    
    // Refresh full data to get updated stats
    console.log('⏳ Scheduling full refresh in 1 second...');
    setTimeout(() => {
      console.log('🔄 Executing scheduled cyber score refresh');
      refreshCyberScore();
    }, 1000);
  }, [addNotification]);
  
  const handleNewIncident = useCallback((data) => {
    const { incidentType, reason, pointsDeducted } = data;
    
    // Add to incident history immediately
    setIncidentHistory(prev => [{
      category: 'overallParticipation',
      reason,
      scoreChange: -pointsDeducted,
      timestamp: new Date(),
      incidentType: 'minor_violation'
      // Removed hostName for privacy
    }, ...prev]);
    
    // Show notification
    addNotification(
      'New Rating Received',
      `You were rated for ${reason}. -${pointsDeducted} points`,
      'warning'
    );
  }, [addNotification]);
  
  const handleMeetingStatsUpdate = useCallback((data) => {
    const { meetingStats } = data;
    
    // Update cyber score with new meeting stats
    if (meetingStats) {
      setCyberScore(prev => ({
        ...prev,
        meetingStats: meetingStats
      }));
      
      // Determine what kind of notification to show based on the stats change
      let notificationTitle = 'Meeting Statistics Updated';
      let notificationMessage = '';
      let notificationType = 'info';
      
      if (meetingStats.meetingsKickedFrom > 0) {
        notificationTitle = 'Removed from Meeting';
        notificationMessage = `You were removed from a meeting. Total removals: ${meetingStats.meetingsKickedFrom}`;
        notificationType = 'warning';
      } else if (meetingStats.meetingsBanned > 0) {
        notificationTitle = 'Meeting Ban Applied';
        notificationMessage = `You have been banned from meetings. Total bans: ${meetingStats.meetingsBanned}`;
        notificationType = 'error';
      } else if (meetingStats.totalMeetingsAttended % 10 === 0 && meetingStats.totalMeetingsAttended > 0) {
        notificationTitle = 'Meeting Milestone!';
        notificationMessage = `Congratulations! You've attended ${meetingStats.totalMeetingsAttended} meetings.`;
        notificationType = 'success';
      } else if (meetingStats.positiveReviews > (cyberScore?.meetingStats?.positiveReviews || 0)) {
        notificationTitle = 'Positive Review!';
        notificationMessage = `You received a positive review! Total: ${meetingStats.positiveReviews}`;
        notificationType = 'success';
      }
      
      // Show notification if there's a meaningful update
      if (notificationMessage) {
        addNotification(notificationTitle, notificationMessage, notificationType);
      }
      
      console.log('Meeting stats updated:', meetingStats);
    }
  }, [cyberScore, addNotification]);
  
  const handlePositiveAward = useCallback((data) => {
    const { awardType, reason, pointsAwarded, comments } = data;
    
    // Map award type to friendly labels
    const awardLabels = {
      excellent_participation: 'Excellent Participation',
      helpful_contribution: 'Helpful Contribution', 
      leadership: 'Leadership Skills',
      technical_assistance: 'Technical Assistance',
      positive_attitude: 'Positive Attitude',
      problem_solving: 'Problem Solving',
      collaborative_spirit: 'Collaborative Spirit'
    };
    
    const awardLabel = awardLabels[awardType] || 'Positive Award';
    
    // Add to score history immediately
    setIncidentHistory(prev => [{
      category: 'overallParticipation',
      reason: `${awardLabel}: ${reason}`,
      scoreChange: pointsAwarded,
      timestamp: new Date(),
      incidentType: 'positive',
      // Removed hostName for privacy
      evidence: {
        notes: comments || '',
        awardType: awardType
      }
    }, ...prev]);
    
    // Show celebratory notification
    addNotification(
      `🎉 ${awardLabel} Award!`,
      `You earned +${pointsAwarded} points for ${reason}`,
      'success'
    );
    
    console.log('Positive award processed:', awardLabel, pointsAwarded, 'points');
  }, [addNotification]);
  
  const cleanupRealtimeUpdates = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);
  
  const setupRealtimeUpdates = useCallback(() => {
    if (!user || !user._id) {
      console.log('Cannot setup realtime updates - no user or user ID');
      return;
    }
    
    console.log('Setting up real-time cyber score monitoring for user:', user._id);
    console.log('Socket.IO URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000');
    
    // Setup Socket.IO connection for real-time updates
    if (!socketRef.current) {
      try {
        socketRef.current = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
          transports: ['websocket'],
          autoConnect: true
        });
        
        console.log('Socket.IO instance created');
        
        socketRef.current.on('connect', () => {
          console.log('✅ Connected to real-time updates, Socket ID:', socketRef.current.id);
          // Join user-specific room for cyber score updates
          socketRef.current.emit('join-cyber-score-updates', { userId: user._id });
          console.log('📡 Joined cyber-score-updates room for user:', user._id);
        });
        
        socketRef.current.on('disconnect', (reason) => {
          console.log('❌ Disconnected from real-time updates. Reason:', reason);
        });
        
        socketRef.current.on('connect_error', (error) => {
          console.error('🔴 Socket connection error:', error);
        });
        
        // Listen for cyber score updates
        socketRef.current.on('cyber-score-updated', (data) => {
          console.log('🎯 Received cyber score update:', data);
          console.log('Current user ID:', user._id);
          console.log('Data user ID:', data.userId);
          if (data.userId === user._id) {
            console.log('✅ Processing cyber score update for current user');
            handleCyberScoreUpdate(data);
          } else {
            console.log('⚠️ Cyber score update not for current user - ignoring');
          }
        });
        
        // Listen for new incidents
        socketRef.current.on('new-incident', (data) => {
          console.log('🚨 Received new incident:', data);
          if (data.userId === user._id) {
            console.log('✅ Processing new incident for current user');
            handleNewIncident(data);
          } else {
            console.log('⚠️ New incident not for current user - ignoring');
          }
        });
        
        // Listen for meeting statistics updates
        socketRef.current.on('meeting-stats-updated', (data) => {
          console.log('Received meeting stats update:', data);
          if (data.userId === user._id) {
            handleMeetingStatsUpdate(data);
          } else {
            console.log('⚠️ Meeting stats update not for current user - ignoring');
          }
        });
        
        // Listen for positive awards
        socketRef.current.on('positive-award', (data) => {
          console.log('Received positive award:', data);
          if (data.userId === user._id) {
            handlePositiveAward(data);
          } else {
            console.log('⚠️ Positive award not for current user - ignoring');
          }
        });
        
        console.log('🎧 All socket event listeners attached');
      } catch (error) {
        console.error('❌ Error creating socket connection:', error);
      }
    } else {
      console.log('📡 Socket already exists, reusing connection');
    }
    
    // Setup periodic polling as backup
    if (!pollIntervalRef.current) {
      pollIntervalRef.current = setInterval(() => {
        if (cyberScore && Date.now() - lastCyberScoreUpdate > 30000) { // 30 seconds
          console.log('⏰ Periodic cyber score refresh triggered');
          refreshCyberScore();
        }
      }, 30000); // Check every 30 seconds
      console.log('⏱️ Periodic polling backup started (30s intervals)');
    }
  }, [user, cyberScore, lastCyberScoreUpdate, handleCyberScoreUpdate, handleNewIncident, handleMeetingStatsUpdate, handlePositiveAward, refreshCyberScore]);

  useEffect(() => {
    // Don't redirect if still loading auth status
    if (isLoading) {
      return;
    }
    
    if (!isAuthenticated) {
      console.log('Profile: User not authenticated, redirecting to login');
      navigate('/login');
      return;
    }

    console.log('Profile: User authenticated, user data:', user);
    
    // Load complete profile data
    loadProfileData();
    
    // Check if edit mode is requested via URL parameter
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get('edit') === 'true') {
      setIsEditing(true);
    }
  }, [isAuthenticated, isLoading, navigate, location.search]);

  // Separate effect to sync formData with user context updates
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        company: user.company || '',
        position: user.position || ''
      });
    }
  }, [user]);
  
  // Load cyber score when user becomes available - use ref to prevent infinite loops
  useEffect(() => {
    if (user && (user._id || user.id) && cyberScore === null && !isLoadingCyberScore) {
      loadCyberScore();
    }
  }, [user?._id, user?.id, cyberScore]);
  
  // Refresh cyber score when page becomes visible (user returns from meeting)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && (user._id || user.id)) {
        const now = Date.now();
        // Only refresh if it's been more than 5 seconds since last update
        if (!lastCyberScoreUpdate || now - lastCyberScoreUpdate > 5000) {
          console.log('Page became visible, refreshing cyber score...');
          refreshCyberScore();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, lastCyberScoreUpdate]);
  
  // Refresh cyber score on focus (when user navigates back to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (user && (user._id || user.id)) {
        const now = Date.now();
        // Only refresh if it's been more than 10 seconds since last update
        if (!lastCyberScoreUpdate || now - lastCyberScoreUpdate > 10000) {
          console.log('Window focused, refreshing cyber score...');
          refreshCyberScore();
        }
      }
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, lastCyberScoreUpdate]);
  
  // Initialize real-time cyber score monitoring
  useEffect(() => {
    if (!user || !user._id) return;
    
    // Only set up real-time updates if enabled
    if (realtimeUpdates) {
      setupRealtimeUpdates();
    }
    
    return () => {
      cleanupRealtimeUpdates();
    };
  }, [user, realtimeUpdates, setupRealtimeUpdates, cleanupRealtimeUpdates]);
  
  
  
  
  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Calculate engagement percentage based on meeting stats
  const calculateEngagementPercent = () => {
    if (!cyberScore?.meetingStats) return 0;
    
    const stats = cyberScore.meetingStats;
    
    // Base score from meetings attended (max 40 points)
    let engagement = Math.min(stats.totalMeetingsAttended * 2, 40);
    
    // Bonus for positive reviews (max 30 points)
    engagement += Math.min(stats.positiveReviews * 3, 30);
    
    // Penalty for negative incidents
    engagement -= stats.negativeReviews * 2;
    engagement -= stats.meetingsKickedFrom * 5;
    engagement -= stats.meetingsBanned * 10;
    
    // Bonus for good average stay duration (above 30 minutes, max 15 points)
    if (stats.averageStayDuration > 30) {
      engagement += Math.min((stats.averageStayDuration - 30) / 5, 15);
    }
    
    return Math.max(0, Math.min(100, engagement));
  };

  // CSS styles for notifications
  const notificationStyles = `
    .cyber-score-notifications {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    }
    
    .cyber-notification {
      background: #fff;
      border-left: 4px solid #007bff;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      padding: 16px;
      margin-bottom: 12px;
      cursor: pointer;
      transition: transform 0.2s ease, opacity 0.2s ease;
      animation: slideInRight 0.3s ease-out;
    }
    
    .cyber-notification:hover {
      transform: translateX(-5px);
    }
    
    .cyber-notification.success {
      border-left-color: #28a745;
    }
    
    .cyber-notification.warning {
      border-left-color: #ffc107;
    }
    
    .cyber-notification.error {
      border-left-color: #dc3545;
    }
    
    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .notification-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #999;
      font-size: 14px;
      padding: 4px;
    }
    
    .notification-close:hover {
      color: #333;
    }
    
    .notification-message {
      color: #333;
      margin-bottom: 8px;
      line-height: 1.4;
    }
    
    .notification-time {
      color: #666;
      font-size: 12px;
    }
    
    .stat-value.duration {
      color: #3b82f6;
      font-weight: 600;
    }
    
    .stat-value.warning {
      color: #f59e0b;
      font-weight: 600;
    }
    
    .stat-value.danger {
      color: #ef4444;
      font-weight: 600;
    }
    
    .stat-value.engagement {
      color: #10b981;
      font-weight: 600;
    }
    
    .score-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-item {
      background: rgba(255, 255, 255, 0.15); /* Semi-transparent for gradient background */
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      padding: 12px;
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      backdrop-filter: blur(10px); /* Add glass effect */
    }
    
    .stat-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .stat-value {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: white; /* Changed to white for visibility on gradient background */
      margin-bottom: 4px;
    }
    
    .stat-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.8); /* Changed to light color for visibility */
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    @keyframes slideInRight {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  
  // Inject styles
  React.useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.type = 'text/css';
    styleSheet.innerText = notificationStyles;
    document.head.appendChild(styleSheet);
    
    return () => {
      if (document.head.contains(styleSheet)) {
        document.head.removeChild(styleSheet);
      }
    };
  }, []);
  
  const toggleRealtimeUpdates = useCallback(() => {
    setRealtimeUpdates(prev => {
      const newValue = !prev;
      console.log(`🔄 Toggling real-time updates: ${prev} → ${newValue}`);
      if (newValue) {
        setupRealtimeUpdates();
      } else {
        cleanupRealtimeUpdates();
      }
      return newValue;
    });
  }, [setupRealtimeUpdates, cleanupRealtimeUpdates]);
  

  const validateForm = () => {
    const errors = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }
    
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }
    
    if (formData.phone && !/^[+]?[1-9][\d]{0,15}$/.test(formData.phone.replace(/[\s\-()]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (formData.bio && formData.bio.length > 500) {
      errors.bio = 'Bio must be less than 500 characters';
    }
    
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    
    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSave = async () => {
    // Validate form first
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setError('Please fix the validation errors below.');
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');
    setValidationErrors({});

    try {
      // Call API to update user profile using profileAPI
      const profileData = {
        ...formData,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        bio: formData.bio.trim(),
        company: formData.company.trim(),
        position: formData.position.trim()
      };
      
      const result = await profileAPI.updateUserProfile(profileData);
      console.log('Profile update API response:', result);

      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Update the auth context with new user data if available
      if (updateUser && result.user) {
        console.log('Updating user context with:', result.user);
        updateUser(result.user);
        
        // Force update local formData to reflect saved changes immediately
        setFormData({
          firstName: result.user.firstName || '',
          lastName: result.user.lastName || '',
          email: result.user.email || '',
          phone: result.user.phone || '',
          bio: result.user.bio || '',
          company: result.user.company || '',
          position: result.user.position || ''
        });
      }
      
      // Refresh complete profile data to ensure all fields are up to date
      setTimeout(() => {
        loadProfileData();
      }, 100);

      setSuccess('✅ Profile updated successfully!');
      
      // Small delay to show the success message before switching modes
      setTimeout(() => {
        setIsEditing(false);
      }, 500);
      
      // Clear the edit parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);

      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess('');
      }, 5000);

    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message || 'Failed to update profile');
      
      if (error.message.includes('login again')) {
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
        company: user.company || '',
        position: user.position || ''
      });
    }
    setIsEditing(false);
    setError('');
    setSuccess('');
    setValidationErrors({});
    
    // Clear the edit parameter from URL
    const newUrl = window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  };

  const getInitials = () => {
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase();
    }
    if (formData.firstName) return formData.firstName[0].toUpperCase();
    if (formData.email) return formData.email[0].toUpperCase();
    return 'U';
  };

  const getDisplayName = () => {
    if (formData.firstName && formData.lastName) {
      return `${formData.firstName} ${formData.lastName}`;
    }
    if (formData.firstName) return formData.firstName;
    return formData.email || 'User';
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="profile-page">
        <Header />
        <div className="profile-container">
          <div className="access-denied">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '200px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e2e8f0',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }}></div>
              <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading your profile...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="profile-page">
        <Header />
        <div className="profile-container">
          <div className="access-denied">
            <h2>Access Denied</h2>
            <p>You need to be logged in to view your profile.</p>
            <button onClick={() => navigate('/login')} className="btn-primary">
              Login
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="profile-page">
      <Header />
      <div className="profile-container">
        <div className="profile-content">
          {/* Profile Header */}
          <div className="profile-header">
            <div className="profile-avatar">
              <div className="avatar-circle">
                {getInitials()}
              </div>
            </div>
            <div className="profile-header-info">
              <h1>{getDisplayName()}</h1>
              <div className="profile-meta">
                <div className="profile-email">
                  <FaEnvelope className="meta-icon" />
                  <span>{formData.email}</span>
                </div>
                {formData.phone && (
                  <div className="profile-phone">
                    <FaPhone className="meta-icon" />
                    <span>{formData.phone}</span>
                  </div>
                )}
                {formData.company && (
                  <div className="profile-company">
                    <FaBuilding className="meta-icon" />
                    <span>{formData.company}</span>
                  </div>
                )}
              </div>
              <div className="profile-header-actions">
                {!isEditing ? (
                  <button 
                    className="btn-edit"
                    onClick={() => setIsEditing(true)}
                  >
                    <FaEdit className="btn-icon" />
                    <span>Edit Profile</span>
                  </button>
                ) : (
                  <div className="edit-mode-indicator">
                    <FaEdit className="edit-icon" />
                    <span>Editing Mode</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="message success">
              ✅ {success}
            </div>
          )}
          
          {error && (
            <div className="message error">
              ⚠️ {error}
            </div>
          )}

          {/* Profile Content */}
          <div className="profile-main">
            <div className="profile-section">
              <h2>Personal Information</h2>
              <div className="profile-grid">
                <div className={`profile-field ${validationErrors.firstName ? 'error' : ''}`}>
                  <label>
                    <FaUser className="field-icon" />
                    First Name
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter your first name"
                        className={validationErrors.firstName ? 'input-error' : ''}
                      />
                      {validationErrors.firstName && (
                        <div className="error-message">{validationErrors.firstName}</div>
                      )}
                    </>
                  ) : (
                    <div className="field-value">{formData.firstName || 'Not provided'}</div>
                  )}
                </div>

                <div className={`profile-field ${validationErrors.lastName ? 'error' : ''}`}>
                  <label>
                    <FaUser className="field-icon" />
                    Last Name
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter your last name"
                        className={validationErrors.lastName ? 'input-error' : ''}
                      />
                      {validationErrors.lastName && (
                        <div className="error-message">{validationErrors.lastName}</div>
                      )}
                    </>
                  ) : (
                    <div className="field-value">{formData.lastName || 'Not provided'}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label>
                    <FaEnvelope className="field-icon" />
                    Email Address
                  </label>
                  <div className="field-value readonly">
                    {formData.email}
                    <span className="field-note">
                      <FaShieldAlt className="shield-icon" />
                      Email cannot be changed
                    </span>
                  </div>
                </div>

                <div className={`profile-field ${validationErrors.phone ? 'error' : ''}`}>
                  <label>
                    <FaPhone className="field-icon" />
                    Phone Number
                  </label>
                  {isEditing ? (
                    <>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="Enter your phone number"
                        className={validationErrors.phone ? 'input-error' : ''}
                      />
                      {validationErrors.phone && (
                        <div className="error-message">{validationErrors.phone}</div>
                      )}
                    </>
                  ) : (
                    <div className="field-value">{formData.phone || 'Not provided'}</div>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h2>Professional Information</h2>
              <div className="profile-grid">
                <div className="profile-field">
                  <label>
                    <FaBuilding className="field-icon" />
                    Company
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="company"
                      value={formData.company}
                      onChange={handleInputChange}
                      placeholder="Enter your company name"
                    />
                  ) : (
                    <div className="field-value">{formData.company || 'Not provided'}</div>
                  )}
                </div>

                <div className="profile-field">
                  <label>
                    <FaBriefcase className="field-icon" />
                    Position
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="position"
                      value={formData.position}
                      onChange={handleInputChange}
                      placeholder="Enter your job title"
                    />
                  ) : (
                    <div className="field-value">{formData.position || 'Not provided'}</div>
                  )}
                </div>
              </div>

              <div className={`profile-field bio-field ${validationErrors.bio ? 'error' : ''}`}>
                <label>
                  Bio
                </label>
                {isEditing ? (
                  <>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      placeholder="Tell us about yourself..."
                      rows={4}
                      maxLength={500}
                      className={validationErrors.bio ? 'input-error' : ''}
                    />
                    <div className={`char-counter ${formData.bio.length > 500 ? 'over-limit' : ''}`}>
                      {formData.bio.length}/500 characters
                    </div>
                    {validationErrors.bio && (
                      <div className="error-message">{validationErrors.bio}</div>
                    )}
                  </>
                ) : (
                  <div className="field-value bio-value">
                    {formData.bio || 'No bio provided'}
                  </div>
                )}
              </div>
            </div>

            {/* Edit Mode Actions */}
            {isEditing && (
              <div className="profile-actions">
                <button 
                  className={`btn-primary save-btn ${isSaving ? 'btn-loading' : ''}`}
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="loading-spinner"></div>
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <FaSave className="btn-icon" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
                <button 
                  className="btn-secondary cancel-btn"
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  <FaTimes className="btn-icon" />
                  <span>Cancel</span>
                </button>
              </div>
            )}

            {/* Account Information */}
            <div className="profile-section">
              <h2>Account Information</h2>
              <div className="account-info">
                <div className="info-item">
                  <span className="info-label">
                    <FaCalendar className="info-icon" />
                    Member since:
                  </span>
                  <span className="info-value">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Unknown'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">
                    <FaShieldAlt className="info-icon" />
                    Account status:
                  </span>
                  <span className={`info-value status ${user?.isActive ? 'active' : 'inactive'}`}>
                    <FaCheck className="status-icon" />
                    {user?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">
                    <FaEnvelope className="info-icon" />
                    Email verified:
                  </span>
                  <span className={`info-value status ${user?.isVerified ? 'verified' : 'unverified'}`}>
                    <FaCheck className="status-icon" />
                    {user?.isVerified ? 'Verified' : 'Not verified'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Cyber Score Section */}
            <div className="profile-section cyber-score-section">
              <div className="cyber-score-header">
                <h2>
                  <FaStar className="section-icon" />
                  Cyber Score & Reputation
                </h2>
                <div className="cyber-score-controls">
                  <button 
                    className={`realtime-toggle-btn ${realtimeUpdates ? 'active' : ''}`}
                    onClick={toggleRealtimeUpdates}
                    title={`${realtimeUpdates ? 'Disable' : 'Enable'} real-time updates`}
                  >
                    <FaBell className={`realtime-icon ${realtimeUpdates ? 'active' : ''}`} />
                    <span className="realtime-label">{realtimeUpdates ? 'Live' : 'Manual'}</span>
                  </button>
                  <button 
                    className="refresh-cyber-score-btn"
                    onClick={refreshCyberScore}
                    disabled={isLoadingCyberScore}
                    title="Refresh cyber score data"
                  >
                    <FaSync className={`refresh-icon ${isLoadingCyberScore ? 'spinning' : ''}`} />
                  </button>
                </div>
              </div>
              
              {isLoadingCyberScore ? (
                <div className="loading-cyber-score">
                  <div className="loading-spinner"></div>
                  <span>Loading your cyber score...</span>
                </div>
              ) : cyberScore ? (
                <>
                  <div className="cyber-score-overview">
                    <div className="cyber-score-main">
                      <CyberScoreBadge 
                        score={cyberScore?.currentScore || 85}
                        reputationLevel={cyberScore?.reputationLevel || 'good'}
                        size="large"
                        showLabel={true}
                        totalMeetings={cyberScore?.meetingStats?.totalMeetingsAttended || 0}
                        isRestricted={cyberScore?.restrictions?.temporaryBan?.isActive || false}
                      />
                    </div>
                    
                    <div className="cyber-score-details">
                      <div className="score-stats">
                        <div className="stat-item">
                          <span className="stat-value">{cyberScore?.meetingStats?.totalMeetingsAttended || 0}</span>
                          <span className="stat-label">Meetings Attended</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value positive">{cyberScore?.meetingStats?.positiveReviews || 0}</span>
                          <span className="stat-label">Positive Reviews</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value negative">{cyberScore?.meetingStats?.negativeReviews || 0}</span>
                          <span className="stat-label">Negative Reviews</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value">{cyberScore?.meetingStats?.hostFeedbackCount || 0}</span>
                          <span className="stat-label">Total Reviews</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value duration">{Math.round(cyberScore?.meetingStats?.averageStayDuration || 0)}min</span>
                          <span className="stat-label">Avg. Stay Duration</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value warning">{cyberScore?.meetingStats?.meetingsKickedFrom || 0}</span>
                          <span className="stat-label">Times Removed by Host</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value danger">{cyberScore?.meetingStats?.meetingsBanned || 0}</span>
                          <span className="stat-label">Times Banned by Host</span>
                        </div>
                        <div className="stat-item">
                          <span className="stat-value engagement">{calculateEngagementPercent()}%</span>
                          <span className="stat-label">Engagement Score</span>
                        </div>
                      </div>
                      
                      <div className="score-description">
                        <h4>What is Cyber Score?</h4>
                        <p>
                          Your Cyber Score reflects your behavior and conduct in meetings. 
                          It starts at 85/100 and can increase with positive interactions or decrease 
                          if hosts report inappropriate behavior. A higher score helps you join meetings more easily.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Review History Toggle */}
                  {Array.isArray(incidentHistory) && incidentHistory.length > 0 && (
                    <div className="review-history-section">
                      <button 
                        className="review-history-toggle"
                        onClick={() => setShowIncidentHistory(!showIncidentHistory)}
                      >
                        <FaHistory className="toggle-icon" />
                        <span>View Review History ({incidentHistory.length})</span>
                        <span className={`toggle-arrow ${showIncidentHistory ? 'expanded' : ''}`}>▼</span>
                      </button>
                      
                      {showIncidentHistory && (
                        <div className="review-history-list">
                          {incidentHistory.map((review, index) => {
                            const isPositive = review?.isPositive || review?.reviewType === 'award';
                            const isNegative = review?.isNegative || review?.reviewType === 'incident';
                            const points = review?.scoreChange || 0;
                            const pointsDisplay = review?.pointsDisplay || (points > 0 ? `+${points}` : `${points}`);
                            
                            return (
                              <div key={review?.id || index} className={`review-item ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
                                <div className="review-header">
                                  <div className="review-type">
                                    {isPositive ? (
                                      <>
                                        <FaStar className="review-icon positive" />
                                        <span>Award: {review?.category?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) || 'Positive Review'}</span>
                                      </>
                                    ) : (
                                      <>
                                        <FaExclamationTriangle className="review-icon negative" />
                                        <span>Incident: {review?.category?.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) || 'Negative Review'}</span>
                                      </>
                                    )}
                                  </div>
                                  <div className={`review-points ${isPositive ? 'positive' : 'negative'}`}>
                                    {pointsDisplay} points
                                  </div>
                                  <div className="review-date">
                                    {review?.formattedDate || (review?.timestamp ? new Date(review.timestamp).toLocaleDateString() : 'Unknown date')}
                                  </div>
                                </div>
                                <div className="review-reason">
                                  {review?.reason || 'No reason provided'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {cyberScore?.restrictions?.temporaryBan?.isActive && (
                    <div className="restriction-notice">
                      <FaExclamationTriangle className="restriction-icon" />
                      <div className="restriction-content">
                        <h4>Account Restriction</h4>
                        <p>
                          Your account has temporary restrictions due to behavior reports. 
                          {cyberScore?.restrictions?.temporaryBan?.bannedUntil && (
                            <> Restrictions will be lifted on {new Date(cyberScore.restrictions.temporaryBan.bannedUntil).toLocaleDateString()}.</>
                          )}
                        </p>
                        {cyberScore?.restrictions?.temporaryBan?.reason && (
                          <p className="restriction-reason">Reason: {cyberScore.restrictions.temporaryBan.reason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="cyber-score-unavailable">
                  <FaStar className="unavailable-icon" />
                  <p>Cyber Score information is currently unavailable.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Real-time Notifications */}
      {notifications.length > 0 && (
        <div className="cyber-score-notifications">
          {notifications.map((notification) => (
            <div 
              key={notification.id} 
              className={`cyber-notification ${notification.type}`}
              onClick={() => dismissNotification(notification.id)}
            >
              <div className="notification-header">
                <strong>{notification.title}</strong>
                <button className="notification-close" onClick={() => dismissNotification(notification.id)}>
                  <FaTimes />
                </button>
              </div>
              <div className="notification-message">{notification.message}</div>
              <div className="notification-time">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default Profile;