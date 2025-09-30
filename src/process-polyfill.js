/* eslint-disable */
// Polyfill completo para process y variables de entorno
(function() {
  // Crear object process completo
  const processPolyfill = {
    env: {
      NODE_ENV: 'development',
      // Variables específicas para Google APIs
      REACT_APP_GOOGLE_CLIENT_ID: process?.env?.REACT_APP_GOOGLE_CLIENT_ID || '',
      REACT_APP_GOOGLE_CLIENT_SECRET: process?.env?.REACT_APP_GOOGLE_CLIENT_SECRET || '',
      REACT_APP_GOOGLE_REDIRECT_URI: process?.env?.REACT_APP_GOOGLE_REDIRECT_URI || '',
      REACT_APP_OPENAI_API_KEY: process?.env?.REACT_APP_OPENAI_API_KEY || ''
    },
    platform: 'browser',
    version: 'v16.0.0',
    versions: {
      node: '16.0.0',
      v8: '9.0.0',
      uv: '1.40.0',
      zlib: '1.2.11'
    },
    arch: 'x64',
    name: 'browser-process',
    type: 'renderer',
    pid: Math.floor(Math.random() * 10000),
    ppid: 1,
    uptime: () => Date.now(),
    cwd: () => '/',
    chdir: () => {},
    hrtime: (time) => {
      const now = Date.now() * 1e-3;
      const sec = Math.floor(now);
      const nano = Math.floor((now % 1) * 1e9);
      if (time) {
        return [sec - time[0], nano - time[1]];
      }
      return [sec, nano];
    },
    memoryUsage: () => ({
      rss: 50 * 1024 * 1024,
      heapTotal: 30 * 1024 * 1024,
      heapUsed: 20 * 1024 * 1024,
      external: 5 * 1024 * 1024
    }),
    nextTick: (fn, ...args) => {
      if (typeof fn !== 'function') {
        throw new TypeError('Callback must be a function');
      }
      setTimeout(() => fn(...args), 0);
    },
    // Event emitter básico
    _events: {},
    on: function(event, listener) {
      if (!this._events[event]) this._events[event] = [];
      this._events[event].push(listener);
      return this;
    },
    emit: function(event, ...args) {
      if (this._events[event]) {
        this._events[event].forEach(listener => listener(...args));
      }
      return this;
    },
    argv: ['node', 'browser-process'],
    exit: () => {},
    title: 'browser-process',
    browser: true
  };

  // Hacer process disponible globalmente INMEDIATAMENTE
  if (typeof window !== 'undefined') {
    window.process = processPolyfill;
    window.global = window.global || window;
  }

  if (typeof global !== 'undefined') {
    global.process = processPolyfill;
  }

  return processPolyfill;
})();