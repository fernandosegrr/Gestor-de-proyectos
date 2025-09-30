// Polyfills para compatibilidad con Node.js en el navegador
import { Buffer } from 'buffer';

// Configurar Buffer global
window.Buffer = Buffer;

// Configurar process global inmediatamente
window.process = {
  env: {
    NODE_ENV: 'development'
  },
  platform: 'browser',
  version: '',
  versions: {},
  arch: '',
  name: 'browser',
  type: 'renderer',
  pid: 1,
  ppid: 1,
  uptime: () => Date.now(),
  cwd: () => '/',
  hrtime: () => [0, 0],
  memoryUsage: () => ({ rss: 0, heapTotal: 0, heapUsed: 0, external: 0 }),
  nextTick: (fn) => setTimeout(fn, 0),
  on: () => {},
  emit: () => {},
  stdin: null,
  stdout: null,
  stderr: null,
  argv: [],
  execPath: '',
  execArgv: [],
  exit: () => {},
  kill: () => {},
  title: 'browser',
  features: {},
  config: {},
  release: {},
  browser: true
};

// Asegurar que process esté disponible en global
if (typeof global !== 'undefined') {
  global.process = window.process;
}

// Configurar en globalThis si está disponible (ESLint disable para compatibilidad)
/* eslint-disable no-undef */
try {
  if (typeof globalThis !== 'undefined' && globalThis !== window) {
    globalThis.process = window.process;
  }
} catch (e) {
  // Ignorar errores si globalThis no está disponible
}
/* eslint-enable no-undef */