// Session Isolation Utility
// Prevents conflicts when multiple users access meetings from the same browser/PC

class SessionManager {
  constructor() {
    this.sessionId = this.generateSessionId();
    this.userSessions = new Map();
    this.activeConnections = new Set();
    
    // Initialize session isolation
    this.setupSessionIsolation();
  }
  
  generateSessionId() {
    // Generate unique session ID based on timestamp and random values
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `session_${timestamp}_${random}`;
  }
  
  setupSessionIsolation() {
    // Create isolated storage for this session
    this.isolatedStorage = {
      prefix: `jointright_${this.sessionId}_`,
      
      setItem: (key, value) => {
        const isolatedKey = this.isolatedStorage.prefix + key;
        localStorage.setItem(isolatedKey, JSON.stringify(value));
      },
      
      getItem: (key) => {
        const isolatedKey = this.isolatedStorage.prefix + key;
        const value = localStorage.getItem(isolatedKey);
        try {
          return value ? JSON.parse(value) : null;
        } catch {
          return value;
        }
      },
      
      removeItem: (key) => {
        const isolatedKey = this.isolatedStorage.prefix + key;
        localStorage.removeItem(isolatedKey);
      },
      
      clear: () => {
        // Clear only this session's data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(this.isolatedStorage.prefix)) {
            localStorage.removeItem(key);
          }
        });
      }
    };
    
    // Store reference for external use (don't override browser sessionStorage)
    this.storage = this.isolatedStorage;
    
    console.log('Session isolation initialized with ID:', this.sessionId);
  }
  
  // Create isolated user context
  createUserContext(userEmail, meetingId) {
    const contextId = `${userEmail}_${meetingId}`;
    const context = {
      sessionId: this.sessionId,
      userEmail,
      meetingId,
      createdAt: new Date().toISOString(),
      connections: new Set(),
      streams: new Map(),
      peers: new Map()
    };
    
    this.userSessions.set(contextId, context);
    return context;
  }
  
  // Get user context
  getUserContext(userEmail, meetingId) {
    const contextId = `${userEmail}_${meetingId}`;
    return this.userSessions.get(contextId);
  }
  
  // Clean up user context
  cleanupUserContext(userEmail, meetingId) {
    const contextId = `${userEmail}_${meetingId}`;
    const context = this.userSessions.get(contextId);
    
    if (context) {
      // Clean up connections
      context.connections.forEach(connection => {
        try {
          if (connection.destroy && typeof connection.destroy === 'function') {
            connection.destroy();
          }
        } catch (error) {
          console.warn('Error cleaning up connection:', error);
        }
      });
      
      // Clean up streams
      context.streams.forEach(stream => {
        try {
          if (stream.getTracks) {
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (error) {
          console.warn('Error cleaning up stream:', error);
        }
      });
      
      // Clean up peers
      context.peers.forEach(peer => {
        try {
          if (peer.destroy && typeof peer.destroy === 'function') {
            peer.destroy();
          }
        } catch (error) {
          console.warn('Error cleaning up peer:', error);
        }
      });
      
      this.userSessions.delete(contextId);
    }
  }
  
  // Add connection to user context
  addConnection(userEmail, meetingId, connection) {
    const context = this.getUserContext(userEmail, meetingId);
    if (context) {
      context.connections.add(connection);
    }
  }
  
  // Add stream to user context
  addStream(userEmail, meetingId, streamId, stream) {
    const context = this.getUserContext(userEmail, meetingId);
    if (context) {
      context.streams.set(streamId, stream);
    }
  }
  
  // Add peer to user context
  addPeer(userEmail, meetingId, peerId, peer) {
    const context = this.getUserContext(userEmail, meetingId);
    if (context) {
      context.peers.set(peerId, peer);
    }
  }
  
  // Get isolated socket namespace
  getSocketNamespace(userEmail, meetingId) {
    return `/${this.sessionId}/${userEmail}/${meetingId}`;
  }
  
  // Get isolated storage for external use
  getStorage() {
    return this.isolatedStorage;
  }
  
  // Store data with session isolation
  setItem(key, value) {
    if (this.isolatedStorage) {
      this.isolatedStorage.setItem(key, value);
    }
  }
  
  // Retrieve data with session isolation
  getItem(key) {
    if (this.isolatedStorage) {
      return this.isolatedStorage.getItem(key);
    }
    return null;
  }
  
  // Remove data with session isolation
  removeItem(key) {
    if (this.isolatedStorage) {
      this.isolatedStorage.removeItem(key);
    }
  }
  
  // Clean up all sessions (call on app unmount)
  cleanup() {
    this.userSessions.forEach((context, contextId) => {
      const [userEmail, meetingId] = contextId.split('_');
      this.cleanupUserContext(userEmail, meetingId);
    });
    
    // Clear session storage
    if (this.isolatedStorage) {
      this.isolatedStorage.clear();
    }
  }
}

// Create global session manager instance
const sessionManager = new SessionManager();

// Enhanced Socket.IO wrapper with session isolation
export class IsolatedSocket {
  constructor(url, options = {}) {
    this.sessionManager = sessionManager;
    this.userEmail = null;
    this.meetingId = null;
    this.socket = null;
    this.url = url;
    this.options = options;
  }
  
  connect(userEmail, meetingId) {
    this.userEmail = userEmail;
    this.meetingId = meetingId;
    
    // Create isolated user context
    const context = this.sessionManager.createUserContext(userEmail, meetingId);
    
    // Enhanced socket options with session isolation
    const isolatedOptions = {
      ...this.options,
      query: {
        ...this.options.query,
        sessionId: this.sessionManager.sessionId,
        userEmail,
        meetingId,
        isolatedSession: true
      },
      forceNew: true // Force new connection to avoid conflicts
    };
    
    // Return a promise for proper async handling
    return new Promise((resolve, reject) => {
      // Import socket.io dynamically to avoid initial loading issues
      import('socket.io-client').then(({ io }) => {
        try {
          this.socket = io(this.url, isolatedOptions);
          
          // Add connection to context
          this.sessionManager.addConnection(userEmail, meetingId, this.socket);
          
          // Setup error handling
          this.socket.on('error', (error) => {
            console.warn('Socket error in isolated session:', error);
          });
          
          this.socket.on('disconnect', (reason) => {
            console.log('Socket disconnected in isolated session:', reason);
          });
          
          this.socket.on('connect', () => {
            console.log('Socket connected in isolated session');
            resolve(this);
          });
          
        } catch (error) {
          console.error('Error creating isolated socket:', error);
          reject(error);
        }
      }).catch(error => {
        console.error('Error importing socket.io-client:', error);
        reject(error);
      });
    });
  }
  
  emit(...args) {
    if (this.socket) {
      return this.socket.emit(...args);
    }
  }
  
  on(event, handler) {
    if (this.socket) {
      return this.socket.on(event, handler);
    }
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    if (this.userEmail && this.meetingId) {
      this.sessionManager.cleanupUserContext(this.userEmail, this.meetingId);
    }
  }
}

// Enhanced Peer wrapper with session isolation
export class IsolatedPeer {
  constructor(options = {}) {
    this.sessionManager = sessionManager;
    this.userEmail = null;
    this.meetingId = null;
    this.peerId = null;
    this.peer = null;
    this.options = options;
  }
  
  create(userEmail, meetingId, peerId, peerOptions = {}) {
    this.userEmail = userEmail;
    this.meetingId = meetingId;
    this.peerId = peerId;
    
    // Enhanced peer options with session isolation
    const isolatedOptions = {
      ...this.options,
      ...peerOptions,
      // Add session-specific configuration
      config: {
        ...this.options.config,
        ...peerOptions.config,
        // Add session ID to ICE configuration
        sessionId: this.sessionManager.sessionId
      }
    };
    
    // Return a promise for proper async handling
    return new Promise((resolve, reject) => {
      // Import simple-peer dynamically
      import('simple-peer').then(({ default: Peer }) => {
        try {
          this.peer = new Peer(isolatedOptions);
          
          // Add peer to session context
          this.sessionManager.addPeer(userEmail, meetingId, peerId, this.peer);
          
          // Enhanced error handling
          this.peer.on('error', (error) => {
            console.warn('Peer error in isolated session:', error);
            // Don't let errors crash the session
          });
          
          this.peer.on('close', () => {
            console.log('Peer closed in isolated session');
          });
          
          console.log('Isolated peer created successfully');
          resolve(this);
          
        } catch (error) {
          console.error('Error creating isolated peer:', error);
          reject(error);
        }
      }).catch(error => {
        console.error('Error importing simple-peer:', error);
        reject(error);
      });
    });
  }
  
  signal(data) {
    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.signal(data);
      } catch (error) {
        console.warn('Error signaling peer in isolated session:', error);
      }
    }
  }
  
  destroy() {
    if (this.peer && !this.peer.destroyed) {
      try {
        this.peer.destroy();
      } catch (error) {
        console.warn('Error destroying peer in isolated session:', error);
      }
    }
  }
  
  on(event, handler) {
    if (this.peer) {
      this.peer.on(event, handler);
    }
  }
}

// Cleanup function for page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    sessionManager.cleanup();
  });
  
  window.addEventListener('unload', () => {
    sessionManager.cleanup();
  });
}

export { sessionManager };
export default sessionManager;