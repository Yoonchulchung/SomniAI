/**
 * Shim for Node.js modules in React Native
 * Required for MQTT library
 */

import 'react-native-url-polyfill/auto';

// Buffer polyfill
if (typeof global.Buffer === 'undefined') {
  global.Buffer = require('buffer').Buffer;
}

// Process polyfill
if (typeof global.process === 'undefined') {
  global.process = require('process');
} else if (!global.process.nextTick) {
  global.process.nextTick = setImmediate;
}

// Stream polyfill
global.stream = require('stream-browserify');

// Events polyfill
global.EventEmitter = require('events').EventEmitter;
