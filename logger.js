/**
 * Simple logger for Xade API
 */

const logger = {
  info: (message, data = {}) => {
    console.log(`🟢 INFO: ${message}`, data);
  },
  
  warn: (message, data = {}) => {
    console.log(`🟠 WARNING: ${message}`, data);
  },
  
  error: (message, data = {}) => {
    console.error(`🔴 ERROR: ${message}`, data);
  },
  
  debug: (message, data = {}) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔵 DEBUG: ${message}`, data);
    }
  }
};

module.exports = logger; 