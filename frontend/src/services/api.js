import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: (process.env.REACT_APP_API_URL || 'http://localhost:5000') + '/api',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add request timestamp for debugging
    config.metadata = { startTime: new Date() };
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common responses
api.interceptors.response.use(
  (response) => {
    // Calculate request duration
    if (response.config.metadata?.startTime) {
      const duration = new Date() - response.config.metadata.startTime;
      console.log(`API Request to ${response.config.url} took ${duration}ms`);
    }
    
    return response;
  },
  (error) => {
    // Handle common error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Token expired or invalid
          if (data.code === 'TOKEN_EXPIRED' || data.code === 'TOKEN_INVALID') {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            localStorage.removeItem('isLoggedIn');
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/')) {
              window.location.href = '/';
            }
          }
          break;
          
        case 403:
          // Forbidden - account issues
          console.warn('Access forbidden:', data.message);
          break;
          
        case 429:
          // Rate limit exceeded
          console.warn('Rate limit exceeded:', data.message);
          break;
          
        case 500:
          // Server error
          console.error('Server error:', data.message);
          break;
          
        default:
          console.error('API Error:', data.message || 'Unknown error');
      }
    } else if (error.request) {
      // Network error
      console.error('Network error - no response received:', error.request);
    } else {
      // Request setup error
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Authentication API endpoints
export const authAPI = {
  // Login with email and password
  login: async (credentials) => {
    console.log('🚀 authAPI.login called with:', { ...credentials, password: '[REDACTED]' });
    console.log('API base URL:', api.defaults.baseURL);
    console.log('Full URL will be:', `${api.defaults.baseURL}/login/direct`);
    
    const response = await api.post('/login/direct', credentials);
    console.log('Raw API response:', response);
    
    // Store authentication data
    if (response.data.success) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      localStorage.setItem('isLoggedIn', 'true');
    }
    
    return response.data;
  },
  
  // Request login OTP
  requestLoginOtp: async (email) => {
    const response = await api.post('/login/request-otp', { email });
    return response.data;
  },
  
  // Verify login OTP
  verifyLoginOtp: async (credentials) => {
    const response = await api.post('/login/verify', credentials);
    
    if (response.data.success) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('userData', JSON.stringify(response.data.user));
      localStorage.setItem('isLoggedIn', 'true');
    }
    
    return response.data;
  },
  
  // Logout
  logout: async () => {
    try {
      await api.post('/login/logout');
    } catch (error) {
      console.warn('Logout API call failed, proceeding with local cleanup');
    } finally {
      // Always clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      localStorage.removeItem('isLoggedIn');
    }
  },
  
  // Refresh token
  refreshToken: async () => {
    const response = await api.post('/login/refresh');
    
    if (response.data.success) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    return response.data;
  },
};

// Signup API endpoints
export const signupAPI = {
  // Request signup OTP
  requestOtp: async (email) => {
    const response = await api.post('/signup/request-otp', { email });
    return response.data;
  },
  
  // Resend signup OTP
  resendOtp: async (email) => {
    const response = await api.post('/signup/resend-otp', { email });
    return response.data;
  },
  
  // Verify signup and create account
  verifySignup: async (signupData) => {
    const response = await api.post('/signup/verify', signupData);
    return response.data;
  },
};

// Meeting API endpoints
export const meetingAPI = {
  // Get user's meetings
  getUserMeetings: async () => {
    const response = await api.get('/meetings');
    return response.data;
  },
  
  // Create a new meeting
  createMeeting: async (meetingData) => {
    const response = await api.post('/meetings', meetingData);
    return response.data;
  },
  
  // Get meeting details
  getMeeting: async (meetingId) => {
    const response = await api.get(`/meetings/${meetingId}`);
    return response.data;
  },
  
  // Update meeting
  updateMeeting: async (meetingId, meetingData) => {
    const response = await api.put(`/meetings/${meetingId}`, meetingData);
    return response.data;
  },
  
  // Delete meeting
  deleteMeeting: async (meetingId) => {
    const response = await api.delete(`/meetings/${meetingId}`);
    return response.data;
  },
  
  // Join meeting
  joinMeeting: async (meetingId) => {
    const response = await api.post(`/meetings/${meetingId}/join`);
    return response.data;
  },
};

// File API endpoints
export const fileAPI = {
  // Upload file
  uploadFile: async (file, onProgress = () => {}) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post('/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentage);
      },
    });
    
    return response.data;
  },
  
  // Get file info
  getFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },
  
  // Delete file
  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },
};

// Profile API endpoints
export const profileAPI = {
  // Get user profile
  getUserProfile: async () => {
    const response = await api.get('/profile/me');
    return response.data;
  },
  
  // Update user profile
  updateUserProfile: async (profileData) => {
    const response = await api.put('/profile/update', profileData);
    return response.data;
  },
};

// Utility functions
export const apiUtils = {
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    return !!(token && isLoggedIn === 'true');
  },
  
  // Get current user data
  getCurrentUser: () => {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  },
  
  // Get auth token
  getAuthToken: () => {
    return localStorage.getItem('authToken');
  },
  
  // Clear authentication data
  clearAuthData: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('isLoggedIn');
  },
  
  // Handle API errors consistently
  handleApiError: (error) => {
    if (error.response?.data) {
      const { data } = error.response;
      
      // Return structured error object
      return {
        message: data.error || data.message || 'An error occurred',
        code: data.code || 'UNKNOWN_ERROR',
        details: data.details || null,
        status: error.response.status,
      };
    }
    
    // Network or other errors
    return {
      message: error.message || 'Network error occurred',
      code: 'NETWORK_ERROR',
      details: null,
      status: 0,
    };
  },
};

// Health check endpoint
export const healthCheck = async () => {
  try {
    const response = await api.get('/health');
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw apiUtils.handleApiError(error);
  }
};

// Export the configured axios instance for custom requests
export default api;