require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { analyzeQuery } = require('./agent');
const logger = require('./logger');

const app = express();
const PORT = 3004;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ CORS Middleware (Allow All Origins)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// ✅ Ensure CORS Headers are Set on All Requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

// ✅ Handle OPTIONS Preflight Requests
app.options('*', (req, res) => {
  res.sendStatus(204);
});

// ✅ Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // Allow 120 requests per minute per IP
  message: { status: 429, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ API Endpoint
app.post('/analyze', limiter, async (req, res) => {
  try {
    const { query, systemPrompt, model, dataSources } = req.body;

    if (!query) {
      logger.warn('Request received without query');
      return res.status(400).json({ success: false, error: 'Query is required' });
    }

    logger.info('Processing analysis request', {
      query: query.substring(0, 100),
      model: model || 'o3-mini',
      dataSources: dataSources || [],
      timestamp: new Date().toISOString()
    });

    const result = await analyzeQuery(query, systemPrompt, model, dataSources);

    res.json(result);
  } catch (error) {
    logger.error('API Error:', { error: error.message, stack: error.stack });

    res.status(500).json({
      success: false,
      error: { message: error.message || 'Internal server error', code: 'INTERNAL_ERROR' }
    });
  }
});

// ✅ Global Error Handling Middleware
app.use((err, req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    success: false,
    error: { message: 'Internal server error', details: process.env.NODE_ENV === 'development' ? err.message : undefined }
  });
});

// ✅ Start Server
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}, allowing all origins`);
});