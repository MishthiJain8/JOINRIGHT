import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, apiUtils } from '../services/api';

// Create the authentication context
const AuthContext = createContext();

// Custom hook to use the authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Session configuration
const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const WARNING_TIME = 10 * 60 * 1000; // 10 minutes before timeout
const CHECK_INTERVAL = 60 * 1000; // Check every minute

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [showSessionWarning, setShowSessionWarning] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Session management and activity tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    // Update last activity time from localStorage on mount
    const storedActivity = localStorage.getItem('lastActivity');
    if (storedActivity) {
      setLastActivity(parseInt(storedActivity));
    }

    // Activity tracking function
    const updateActivity = () => {
      const now = Date.now();
      setLastActivity(now);
      localStorage.setItem('lastActivity', now.toString());
      setShowSessionWarning(false);
    };

    // Session timeout check function
    const checkSession = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;
      
      if (timeSinceActivity >= SESSION_TIMEOUT) {
        console.log('Session expired due to inactivity');
        handleSessionExpired();
      } else if (timeSinceActivity >= SESSION_TIMEOUT - WARNING_TIME && !showSessionWarning) {
        console.log('Showing session warning');
        setShowSessionWarning(true);
      }
    };

    // Add activity listeners
    const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    activities.forEach(activity => {
      document.addEventListener(activity, updateActivity, { passive: true });
    });

    // Set up session check interval
    const sessionInterval = setInterval(checkSession, CHECK_INTERVAL);

    // Initial session check
    checkSession();

    // Cleanup
    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, updateActivity);
      });
      clearInterval(sessionInterval);
    };
  }, [isAuthenticated, lastActivity, showSessionWarning]);

  // Handle session expiration
  const handleSessionExpired = async () => {
    console.log('Session expired - logging out user');
    setShowSessionWarning(false);
    
    // Clear auth data immediately
    apiUtils.clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    setLastActivity(0);
    
    // Show a user-friendly message
    alert('Your session has expired due to inactivity. Please log in again.');
    
    // Force redirect to login
    window.location.href = '/';
  };

  // Extend session when user is active
  const extendSession = () => {
    const now = Date.now();
    setLastActivity(now);
    localStorage.setItem('lastActivity', now.toString());
    setShowSessionWarning(false);
    console.log('Session extended due to user activity');
  };

  // Check if user is authenticated with enhanced token validation
  const checkAuthStatus = async () => {
    try {
      console.log('🔍 Checking auth status on app load...');
      const token = apiUtils.getAuthToken();
      const userData = apiUtils.getCurrentUser();
      const lastActivityTime = localStorage.getItem('lastActivity');
      
      console.log('Stored auth data:', { 
        hasToken: !!token, 
        userData,
        tokenLength: token?.length,
        lastActivity: lastActivityTime
      });
      
      if (token && userData) {
        // Check if session has expired due to inactivity
        if (lastActivityTime) {
          const timeSinceActivity = Date.now() - parseInt(lastActivityTime);
          if (timeSinceActivity >= SESSION_TIMEOUT) {
            console.log('Session expired on page load - clearing auth');
            apiUtils.clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
        }

        // Try to refresh token to validate it, but don't fail if it doesn't work
        try {
          console.log('Attempting to refresh token...');
          const refreshResult = await refreshToken();
          console.log('Token refresh result:', refreshResult);
        } catch (refreshError) {
          console.warn('Token refresh failed, but continuing with stored data:', refreshError);
          // Only logout if the token refresh explicitly indicates the token is invalid
          if (refreshError.response?.status === 401) {
            console.log('Token is definitely invalid, logging out');
            apiUtils.clearAuthData();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            return;
          }
        }
        
        // Set user as authenticated with stored data
        console.log('Setting user as authenticated with stored data');
        setUser(userData);
        setIsAuthenticated(true);
        // Set current time as last activity
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('lastActivity', now.toString());
      } else {
        console.log('No auth data found, setting unauthenticated state');
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      console.log('Auth check complete, setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (credentials) => {
    try {
      console.log('📞 AuthContext login called');
      setError(null);
      setIsLoading(true);
      
      console.log('Calling authAPI.login...');
      const response = await authAPI.login(credentials);
      console.log('authAPI.login response:', response);
      
      if (response.success) {
        console.log('Setting user and authenticated state:', response.user);
        setUser(response.user);
        setIsAuthenticated(true);
        // Set initial activity time
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('lastActivity', now.toString());
        return { success: true, user: response.user };
      }
      
      console.error('Login response not successful:', response);
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      const apiError = apiUtils.handleApiError(error);
      setError(apiError.message);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  };

  // Login with OTP
  const loginWithOtp = async (credentials) => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await authAPI.verifyLoginOtp(credentials);
      
      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        // Set initial activity time
        const now = Date.now();
        setLastActivity(now);
        localStorage.setItem('lastActivity', now.toString());
        return { success: true, user: response.user };
      }
      
      throw new Error(response.message || 'OTP verification failed');
    } catch (error) {
      const apiError = apiUtils.handleApiError(error);
      setError(apiError.message);
      throw apiError;
    } finally {
      setIsLoading(false);
    }
  };

  // Request login OTP
  const requestLoginOtp = async (email) => {
    try {
      setError(null);
      const response = await authAPI.requestLoginOtp(email);
      return response;
    } catch (error) {
      const apiError = apiUtils.handleApiError(error);
      setError(apiError.message);
      throw apiError;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await authAPI.logout();
    } catch (error) {
      console.warn('Logout API call failed, but proceeding with local cleanup');
    } finally {
      // CRITICAL: Clear all authentication data from localStorage
      apiUtils.clearAuthData();
      
      // Always clear local state
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
      setIsLoading(false);
      setLastActivity(0);
      setShowSessionWarning(false);
      
      // Clear session/activity data from localStorage
      localStorage.removeItem('lastActivity');
      
      // Force redirect to login page to ensure clean state
      window.location.href = '/';
    }
  };

  // Refresh token
  const refreshToken = async () => {
    try {
      const response = await authAPI.refreshToken();
      if (response.success) {
        // Token is automatically updated by the API service
        return true;
      }
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Only force logout if it's definitely a token issue (401)
      if (error.response?.status === 401) {
        console.log('Token is invalid, forcing logout');
        await logout();
      }
      return false;
    }
  };

  // Update user data
  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
    
    // Update localStorage
    const currentUserData = apiUtils.getCurrentUser();
    if (currentUserData) {
      const updatedUserData = { ...currentUserData, ...userData };
      localStorage.setItem('userData', JSON.stringify(updatedUserData));
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Check if user has specific role
  const hasRole = (role) => {
    return user?.role === role;
  };

  // Check if user has any of the specified roles
  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // Get user's full name
  const getUserDisplayName = () => {
    if (!user) return '';
    
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    
    if (firstName || lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return user.email || 'User';
  };

  // Context value
  const value = {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    showSessionWarning,
    lastActivity,
    
    // Authentication methods
    login,
    loginWithOtp,
    requestLoginOtp,
    logout,
    refreshToken,
    
    // User management
    updateUser,
    getUserDisplayName,
    
    // Session management
    extendSession,
    handleSessionExpired,
    
    // Utility methods
    checkAuthStatus,
    clearError,
    hasRole,
    hasAnyRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// HOC for protecting routes that require authentication
export const withAuth = (WrappedComponent) => {
  const AuthenticatedComponent = (props) => {
    const { isAuthenticated, isLoading } = useAuth();
    
    if (isLoading) {
      return (
        <div style={loadingStyles.container}>
          <div style={loadingStyles.spinner}></div>
          <p style={loadingStyles.text}>Loading...</p>
        </div>
      );
    }
    
    if (!isAuthenticated) {
      // Redirect to login
      window.location.href = '/';
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
  
  AuthenticatedComponent.displayName = `withAuth(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return AuthenticatedComponent;
};

// Loading styles
const loadingStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e2e8f0',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  text: {
    marginTop: '16px',
    color: '#64748b',
    fontSize: '16px',
    fontWeight: '500',
  },
};