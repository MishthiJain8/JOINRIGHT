// Advanced Browser Polyfills with Stream Support
// This fixes the _readableState error when multiple users join meetings

// Global polyfill
if (typeof global === 'undefined') {
  window.global = window;
}

// Process polyfill with enhanced environment
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
    pid: Math.floor(Math.random() * 10000) + 1000, // Unique PID per session
    ppid: 0,
    execPath: '',
    debugPort: 9229,
    
    // Enhanced methods
    nextTick: function(callback, ...args) {
      return setTimeout(() => callback(...args), 0);
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
    
    // Enhanced streams
    stdout: {
      write: function(data) {
        console.log(data);
        return true;
      },
      writable: true,
      readable: false
    },
    
    stderr: {
      write: function(data) {
        console.error(data);
        return true;
      },
      writable: true,
      readable: false
    },
    
    stdin: {
      read: function() {
        return null;
      },
      readable: true,
      writable: false
    },
    
    // Event emitter methods
    on: function() {},
    once: function() {},
    emit: function() {},
    removeListener: function() {},
    removeAllListeners: function() {}
  };
}

// Enhanced Buffer polyfill
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
    
    static concat(list, totalLength) {
      if (!Array.isArray(list)) {
        throw new TypeError('list argument must be an Array of Buffers');
      }
      
      if (list.length === 0) {
        return new Buffer(0);
      }
      
      let length = 0;
      if (totalLength === undefined) {
        for (let i = 0; i < list.length; i++) {
          length += list[i].length;
        }
      } else {
        length = totalLength;
      }
      
      const buffer = new Buffer(length);
      let pos = 0;
      
      for (let i = 0; i < list.length; i++) {
        const buf = list[i];
        for (let j = 0; j < buf.length && pos < length; j++) {
          buffer.data[pos++] = buf.data[j];
        }
      }
      
      return buffer;
    }
    
    toString(encoding = 'utf8') {
      if (encoding === 'utf8' || encoding === 'utf-8') {
        return String.fromCharCode(...this.data);
      }
      if (encoding === 'hex') {
        return this.data.map(b => b.toString(16).padStart(2, '0')).join('');
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
    
    copy(target, targetStart = 0, sourceStart = 0, sourceEnd = this.length) {
      if (!Buffer.isBuffer(target)) {
        throw new TypeError('argument should be a Buffer');
      }
      
      const sourceLength = Math.min(sourceEnd - sourceStart, this.length - sourceStart);
      const targetLength = Math.min(target.length - targetStart, sourceLength);
      
      for (let i = 0; i < targetLength; i++) {
        target.data[targetStart + i] = this.data[sourceStart + i];
      }
      
      return targetLength;
    }
    
    write(string, offset = 0, length, encoding = 'utf8') {
      const bytes = Array.from(string).map(char => char.charCodeAt(0));
      const actualLength = Math.min(length || bytes.length, this.length - offset);
      
      for (let i = 0; i < actualLength; i++) {
        this.data[offset + i] = bytes[i];
      }
      
      return actualLength;
    }
    
    equals(otherBuffer) {
      if (!Buffer.isBuffer(otherBuffer)) {
        return false;
      }
      
      if (this.length !== otherBuffer.length) {
        return false;
      }
      
      for (let i = 0; i < this.length; i++) {
        if (this.data[i] !== otherBuffer.data[i]) {
          return false;
        }
      }
      
      return true;
    }
    
    compare(otherBuffer) {
      if (!Buffer.isBuffer(otherBuffer)) {
        throw new TypeError('argument must be a Buffer');
      }
      
      const minLength = Math.min(this.length, otherBuffer.length);
      
      for (let i = 0; i < minLength; i++) {
        if (this.data[i] < otherBuffer.data[i]) {
          return -1;
        }
        if (this.data[i] > otherBuffer.data[i]) {
          return 1;
        }
      }
      
      if (this.length < otherBuffer.length) {
        return -1;
      }
      if (this.length > otherBuffer.length) {
        return 1;
      }
      
      return 0;
    }
  };
}

// Enhanced Stream polyfills to fix _readableState errors
if (typeof window.Stream === 'undefined') {
  class EventEmitter {
    constructor() {
      this._events = {};
      this._maxListeners = 10;
    }
    
    on(event, listener) {
      if (!this._events[event]) {
        this._events[event] = [];
      }
      this._events[event].push(listener);
      return this;
    }
    
    once(event, listener) {
      const onceWrapper = (...args) => {
        listener(...args);
        this.removeListener(event, onceWrapper);
      };
      this.on(event, onceWrapper);
      return this;
    }
    
    emit(event, ...args) {
      if (this._events[event]) {
        this._events[event].forEach(listener => {
          try {
            listener(...args);
          } catch (error) {
            console.warn('Error in event listener:', error);
          }
        });
      }
      return this._events[event] ? this._events[event].length > 0 : false;
    }
    
    removeListener(event, listener) {
      if (this._events[event]) {
        const index = this._events[event].indexOf(listener);
        if (index !== -1) {
          this._events[event].splice(index, 1);
        }
      }
      return this;
    }
    
    removeAllListeners(event) {
      if (event) {
        delete this._events[event];
      } else {
        this._events = {};
      }
      return this;
    }
  }
  
  class Readable extends EventEmitter {
    constructor(options = {}) {
      super();
      this.readable = true;
      this.destroyed = false;
      this._readableState = {
        objectMode: options.objectMode || false,
        highWaterMark: options.highWaterMark || 16 * 1024,
        buffer: [],
        length: 0,
        pipes: null,
        flowing: null,
        ended: false,
        endEmitted: false,
        reading: false,
        sync: true,
        needReadable: false,
        emittedReadable: false,
        readableListening: false,
        resumeScheduled: false,
        destroyed: false,
        defaultEncoding: options.defaultEncoding || 'utf8',
        awaitDrain: 0,
        readingMore: false,
        decoder: null,
        encoding: null
      };
    }
    
    _read(size) {
      // Override in subclass
    }
    
    read(size) {
      if (this.destroyed || this._readableState.ended) {
        return null;
      }
      
      // Simulate reading data
      if (this._readableState.buffer.length > 0) {
        return this._readableState.buffer.shift();
      }
      
      return null;
    }
    
    push(chunk) {
      if (chunk === null) {
        this._readableState.ended = true;
        this.emit('end');
        return false;
      }
      
      if (this.destroyed) {
        return false;
      }
      
      this._readableState.buffer.push(chunk);
      this.emit('data', chunk);
      return true;
    }
    
    pipe(destination) {
      this.on('data', (chunk) => {
        if (destination.write) {
          destination.write(chunk);
        }
      });
      
      this.on('end', () => {
        if (destination.end) {
          destination.end();
        }
      });
      
      return destination;
    }
    
    destroy(error) {
      if (this.destroyed) {
        return this;
      }
      
      this.destroyed = true;
      this._readableState.destroyed = true;
      
      if (error) {
        this.emit('error', error);
      }
      
      this.emit('close');
      return this;
    }
    
    pause() {
      this._readableState.flowing = false;
      return this;
    }
    
    resume() {
      this._readableState.flowing = true;
      this.emit('resume');
      return this;
    }
  }
  
  class Writable extends EventEmitter {
    constructor(options = {}) {
      super();
      this.writable = true;
      this.destroyed = false;
      this._writableState = {
        objectMode: options.objectMode || false,
        highWaterMark: options.highWaterMark || 16 * 1024,
        buffer: [],
        length: 0,
        writing: false,
        corked: 0,
        sync: true,
        bufferProcessing: false,
        needDrain: false,
        ending: false,
        ended: false,
        finished: false,
        destroyed: false,
        decodeStrings: options.decodeStrings !== false,
        defaultEncoding: options.defaultEncoding || 'utf8'
      };
    }
    
    _write(chunk, encoding, callback) {
      // Override in subclass
      if (callback) callback();
    }
    
    write(chunk, encoding, callback) {
      if (this.destroyed) {
        return false;
      }
      
      if (typeof encoding === 'function') {
        callback = encoding;
        encoding = 'utf8';
      }
      
      this._write(chunk, encoding, callback);
      return true;
    }
    
    end(chunk, encoding, callback) {
      if (typeof chunk === 'function') {
        callback = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === 'function') {
        callback = encoding;
        encoding = null;
      }
      
      if (chunk) {
        this.write(chunk, encoding);
      }
      
      this._writableState.ending = true;
      this._writableState.ended = true;
      this.emit('finish');
      
      if (callback) {
        callback();
      }
      
      return this;
    }
    
    destroy(error) {
      if (this.destroyed) {
        return this;
      }
      
      this.destroyed = true;
      this._writableState.destroyed = true;
      
      if (error) {
        this.emit('error', error);
      }
      
      this.emit('close');
      return this;
    }
  }
  
  class Duplex extends Readable {
    constructor(options = {}) {
      super(options);
      this.writable = true;
      this._writableState = {
        objectMode: options.objectMode || false,
        highWaterMark: options.highWaterMark || 16 * 1024,
        buffer: [],
        length: 0,
        writing: false,
        corked: 0,
        sync: true,
        bufferProcessing: false,
        needDrain: false,
        ending: false,
        ended: false,
        finished: false,
        destroyed: false,
        decodeStrings: options.decodeStrings !== false,
        defaultEncoding: options.defaultEncoding || 'utf8'
      };
    }
    
    _write(chunk, encoding, callback) {
      // Override in subclass
      if (callback) callback();
    }
    
    write(chunk, encoding, callback) {
      if (this.destroyed) {
        return false;
      }
      
      if (typeof encoding === 'function') {
        callback = encoding;
        encoding = 'utf8';
      }
      
      this._write(chunk, encoding, callback);
      return true;
    }
    
    end(chunk, encoding, callback) {
      if (typeof chunk === 'function') {
        callback = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === 'function') {
        callback = encoding;
        encoding = null;
      }
      
      if (chunk) {
        this.write(chunk, encoding);
      }
      
      this._writableState.ending = true;
      this._writableState.ended = true;
      this.emit('finish');
      
      if (callback) {
        callback();
      }
      
      return this;
    }
  }
  
  // Export stream classes
  window.Stream = {
    Readable,
    Writable,
    Duplex,
    EventEmitter
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

// URL polyfill for older browsers
if (typeof URL === 'undefined') {
  window.URL = function(url, base) {
    const a = document.createElement('a');
    a.href = base ? new URL(base).href : url;
    return {
      href: a.href,
      protocol: a.protocol,
      host: a.host,
      hostname: a.hostname,
      port: a.port,
      pathname: a.pathname,
      search: a.search,
      hash: a.hash,
      origin: a.protocol + '//' + a.host
    };
  };
}

// Additional utility functions
window.nextTick = window.nextTick || process.nextTick;

console.log('✅ Advanced browser polyfills loaded successfully');
console.log('📊 Stream polyfills:', typeof window.Stream !== 'undefined');
console.log('🔧 Process polyfill:', typeof process !== 'undefined');
console.log('💾 Buffer polyfill:', typeof Buffer !== 'undefined');