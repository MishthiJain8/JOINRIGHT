// API Configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  ENDPOINTS: {
    // Auth endpoints
    LOGIN: '/api/login',
    SIGNUP: '/api/signup',
    
    // Meeting endpoints  
    MEETINGS: '/api/meetings',
    
    // Contact endpoints
    CONTACT: {
      SUBMIT: '/api/contact/submit',
      MESSAGES: '/api/contact/messages'
    },
    
    // Admin endpoints
    ADMIN: {
      BASE: '/api/admin',
      HEALTH: '/api/admin/health',
      STATS: '/api/admin/stats',
      USERS: '/api/admin/users',
      LOGS: '/api/admin/logs',
      BULK_OPERATIONS: '/api/admin/users/bulk-operation'
    }
  }
};

// Helper function to build full API URL
export const buildApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function for authenticated API calls
export const makeAuthenticatedRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('authToken');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const response = await fetch(buildApiUrl(endpoint), config);
  
  // Handle 401 Unauthorized
  if (response.status === 401) {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
    throw new Error('Authentication failed');
  }
  
  return response;
};

export { API_CONFIG };
export default API_CONFIG;