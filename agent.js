const axios = require('axios');
const OpenAI = require('openai');
const coins = require('./coins.json');
require('dotenv').config();

// Imported modular components
const { 
  fetchPriceHistory, 
  fetchCryptoPanicData, 
  fetchMarketData, 
  fetchMetadata,
  fetchHistoricPortfolioData,
  fetchWalletPortfolio 
} = require('./services/dataServices');

const {
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateEMA,
  determineTrend,
  calculateVolatility,
  calculateTrend,
  getTokenName
} = require('./utils/calculationUtils');

const {
  website,
  twitter,
  telegram,
  discord,
  description,
  price,
  volume,
  marketCap,
  marketCapDiluted,
  liquidity,
  liquidityChange24h,
  offChainVolume,
  volume7d,
  volumeChange24h,
  priceChange24h,
  priceChange1h,
  priceChange7d,
  priceChange1m,
  priceChange30d,
  priceChange1y,
  ath,
  atl,
  rank,
  totalSupply,
  circulatingSupply,
  cexs,
  investors,
  distribution,
  releaseSchedule,
  priceHistoryData,
  isListed,
  getPriceHistory,
  getSocialData,
  getListByCategory
} = require('./services/tokenServices');

// Get API key from various possible environment variable names
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.warn('Warning: No OpenAI API key found in environment variables.');
}

// Initialize OpenAI with more robust API key handling
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Add portfolioAddresses if not defined
const portfolioAddresses = [
    "0x0000000000000000000000000000000000000000"
];

// Add LunarCrush API constant
const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || process.env.REACT_APP_LUNARCRUSH_API_KEY;

// Constants
const TIME_PERIODS = {
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000
};

// Add model configuration
const MODEL_CONFIG = {
  'o3-mini': {
    type: 'openai',
    model: 'o3-mini'
  },
  'io.net': {
    type: 'io.net',
    model: 'meta-llama/Llama-3.3-70B-Instruct',
    url: 'https://api.intelligence.io.solutions/api/v1/chat/completions',
    authToken: 'io-v2-eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJvd25lciI6IjRlMjg4NTg3LTEyOTktNGIxZS1hYjZmLWMxM2ExZGRiNTVkMiIsImV4cCI6NDg5NTQ5NTA5N30.K5Ub3GSKKTbsyFMR2kWPBPvNdu0d5vQ0M1otD29yq8N4pWraOQIiYGQF0HRDz1CCxQD9dUH2LwCNqVfG-3wKEw'
  }
};

// Import AI services
const {
  dataAPI,
  characterAPI,
  executeCode,
  analyzeQuery
} = require('./services/aiServices');

// Export the modules
module.exports = {
    analyzeQuery,
    executeCode,
    dataAPI,
    characterAPI,
    priceHistoryData,
    priceChange30d,
    getSocialData,
    getListByCategory,
    TIME_PERIODS,
    LUNARCRUSH_API_KEY,
    portfolioAddresses,
    openai,
    // Add more exports as needed
};


