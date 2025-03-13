require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { analyzeQuery } = require('./agent');
const logger = require('./logger');
const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // Allow 120 requests per minute per IP
  message: {
    status: 429,
    error: 'Too many requests, please try again later',
    nextValidRequestTime: '' // Will be automatically filled
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// API endpoint
app.post('/api/analyze', limiter, async (req, res) => {
  const startTime = Date.now();
  try {
    const { query, systemPrompt } = req.body;
    
    if (!query) {
      logger.warn('Request received without query');
      res.status(400).json({
        success: false,
        error: 'Query is required'
      });
      query = '';
    }

    logger.info('Processing analysis request', {
      query: query?.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    const result = await analyzeQuery(query, systemPrompt);
    
    const duration = Date.now() - startTime;
    logger.info('Analysis completed', {
      duration,
      success: true
    });

    res.json(result);

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('API Error:', {
      error: error.message,
      stack: error.stack,
      duration
    });

    res.status(error.status || 500).json({
      success: false,
      error: {
        message: error.message || 'Internal server error',
        code: error.code || 'INTERNAL_ERROR'
      }
    });
  }
});

// Add this new endpoint

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

// Update port to work with Elastic Beanstalk
const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 