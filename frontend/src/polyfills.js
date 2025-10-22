// Browser polyfills for Node.js globals
// This file should be imported at the very top of index.js

// Global polyfill
if (typeof global === 'undefined') {
  window.global = window;
}

// Process polyfill
if (typeof process === 'undefined') {
  window.process = {
    env: {
      NODE_ENV: 'development',
      REACT_APP_API_URL: 'http://localhost:5000'
    },
    version: '16.0.0',
    versions: {
      node: '16.0.0',
      v8: '9.0.0'
    },
    platform: 'browser',
    arch: 'x64',
    browser: true,
    title: 'browser',
    argv: [],
    pid: 1,
    ppid: 0,
    execPath: '',
    debugPort: 9229,
    
    // Methods
    nextTick: function(callback, ...args) {
      setTimeout(() => callback(...args), 0);
    },
    
    cwd: function() {
      return '/';
    },
    
    chdir: function() {
      // No-op in browser
    },
    
    exit: function() {
      // No-op in browser
    },
    
    kill: function() {
      // No-op in browser
    },
    
    uptime: function() {
      return Math.floor(performance.now() / 1000);
    },
    
    hrtime: function(previousTimestamp) {
      const now = performance.now();
      if (previousTimestamp) {
        const seconds = Math.floor((now - previousTimestamp[0] * 1000 - previousTimestamp[1] / 1e6) / 1000);
        const nanoseconds = Math.floor(((now - previousTimestamp[0] * 1000 - previousTimestamp[1] / 1e6) % 1000) * 1e6);
        return [seconds, nanoseconds];
      }
      const seconds = Math.floor(now / 1000);
      const nanoseconds = Math.floor((now % 1000) * 1e6);
      return [seconds, nanoseconds];
    },
    
    // Streams
    stdout: {
      write: function(data) {
        console.log(data);
      }
    },
    
    stderr: {
      write: function(data) {
        console.error(data);
      }
    },
    
    stdin: {
      read: function() {
        return null;
      }
    }
  };
}

// Buffer polyfill (basic implementation)
if (typeof Buffer === 'undefined') {
  window.Buffer = class Buffer {
    constructor(data, encoding = 'utf8') {
      if (typeof data === 'number') {
        this.data = new Array(data).fill(0);
        this.length = data;
      } else if (typeof data === 'string') {
        this.data = Array.from(data).map(char => char.charCodeAt(0));
        this.length = this.data.length;
      } else if (Array.isArray(data)) {
        this.data = [...data];
        this.length = data.length;
      } else {
        this.data = [];
        this.length = 0;
      }
    }
    
    static isBuffer(obj) {
      return obj instanceof Buffer;
    }
    
    static from(data, encoding = 'utf8') {
      return new Buffer(data, encoding);
    }
    
    static alloc(size, fill = 0) {
      const buffer = new Buffer(size);
      if (fill !== 0) {
        buffer.data.fill(fill);
      }
      return buffer;
    }
    
    static allocUnsafe(size) {
      return new Buffer(size);
    }
    
    toString(encoding = 'utf8') {
      if (encoding === 'utf8' || encoding === 'utf-8') {
        return String.fromCharCode(...this.data);
      }
      return this.data.join(',');
    }
    
    toJSON() {
      return {
        type: 'Buffer',
        data: this.data
      };
    }
    
    slice(start = 0, end = this.length) {
      return new Buffer(this.data.slice(start, end));
    }
    
    write(string, offset = 0, length, encoding = 'utf8') {
      const bytes = Array.from(string).map(char => char.charCodeAt(0));
      const actualLength = Math.min(length || bytes.length, this.length - offset);
      
      for (let i = 0; i < actualLength; i++) {
        this.data[offset + i] = bytes[i];
      }
      
      return actualLength;
    }
  };
}

// Additional globals that might be needed
if (typeof setImmediate === 'undefined') {
  window.setImmediate = function(callback, ...args) {
    return setTimeout(() => callback(...args), 0);
  };
}

if (typeof clearImmediate === 'undefined') {
  window.clearImmediate = function(id) {
    return clearTimeout(id);
  };
}

// Export for manual import if needed
export { };

console.log('✅ Browser polyfills loaded successfully');