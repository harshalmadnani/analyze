// Simple logger implementation that doesn't require winston
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// File paths for logs
const errorLogPath = path.join(logsDir, 'error.log');
const combinedLogPath = path.join(logsDir, 'combined.log');

// Simple timestamp function
const timestamp = () => new Date().toISOString();

// Format log entry
const formatLog = (level, message, data = {}) => {
  return JSON.stringify({
    timestamp: timestamp(),
    level,
    message,
    ...data
  }) + '\n';
};

// Write to log file
const writeToLog = (filePath, content) => {
  try {
    fs.appendFileSync(filePath, content);
  } catch (error) {
    console.error(`Failed to write to log file ${filePath}:`, error);
  }
};

// Logger implementation
const logger = {
  info: (message, data = {}) => {
    const logEntry = formatLog('info', message, data);
    console.log(`INFO: ${message}`, data);
    writeToLog(combinedLogPath, logEntry);
  },
  
  warn: (message, data = {}) => {
    const logEntry = formatLog('warn', message, data);
    console.warn(`WARN: ${message}`, data);
    writeToLog(combinedLogPath, logEntry);
  },
  
  error: (message, data = {}) => {
    const logEntry = formatLog('error', message, data);
    console.error(`ERROR: ${message}`, data);
    writeToLog(errorLogPath, logEntry);
    writeToLog(combinedLogPath, logEntry);
  }
};

module.exports = logger; 