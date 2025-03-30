const axios = require('axios');
const OpenAI = require('openai');

// Get API key from various possible environment variable names
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;

// Initialize OpenAI with more robust API key handling
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

// Model configuration
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

// Dependencies
const { getTokenName } = require('../utils/calculationUtils');
const portfolioAddresses = ["0x0000000000000000000000000000000000000000"]; // Default address

// Get kadenacontext function from agent.js properly
// We'll use a lazy loading approach to avoid circular reference
let kadenacontextFn = null;
const kadenacontext = async (query) => {
  if (!kadenacontextFn) {
    // Import on first use to avoid circular dependency
    kadenacontextFn = require('../agent').kadenacontext;
  }
  return kadenacontextFn(query);
};

/**
 * AI function to generate data fetching code based on user input
 * @param {string} userInput - The user's question
 * @param {string} model - The AI model to use
 * @returns {Promise<string>} - Data fetching code
 */
const dataAPI = async (userInput, model = 'o3-mini') => {
  try {
    const systemContent = `You are Xade AI's data fetcher. Your role is to identify and fetch the relevant data based on the user's question.
            The user's wallet addresses are: ${portfolioAddresses.join(', ')}

Available functions:
- Market Data:
  - price(token) - returns current price in USD
  - volume(token) - returns 24h volume
  - marketCap(token) - returns market cap
  - marketCapDiluted(token) - returns fully diluted market cap
  - liquidity(token) - returns liquidity
  - liquidityChange24h(token) - returns 24h liquidity change %
  - offChainVolume(token) - returns off-chain volume
  - volume7d(token) - returns 7d volume
  - volumeChange24h(token) - returns 24h volume change %
  - isListed(token) - returns listing status
  - priceChange24h(token) - returns 24h price change %
  - priceChange1h(token) - returns 1h price change %
  - priceChange7d(token) - returns 7d price change %
  - priceChange1m(token) - returns 30d price change %
  - priceChange1y(token) - returns 1y price change %
  - ath(token) - returns all-time high price
  - atl(token) - returns all-time low price
  - rank(token) - returns market rank
  - totalSupply(token) - returns total supply
  - circulatingSupply(token) - returns circulating supply

- Social/Info:
  - website(token) - returns official website URL
  - twitter(token) - returns Twitter handle
  - telegram(token) - returns Telegram group link
  - discord(token) - returns Discord server link
  - description(token) - returns project description

- Historical Data:
  - priceHistoryData(token, period) - returns array of {date, price} objects
  - getHistoricPortfolioData(addresses, period) - returns {wallet, wallets, currentBalance, balanceHistory}
  Periods can be "1d", "7d", "30d", "1y"

- Wallet Analysis:
  - getWalletPortfolio(address) - returns detailed wallet information
  - cexs(token) - returns exchange listing information
  - investors(token) - returns detailed investor information
  - distribution(token) - returns token distribution
  - releaseSchedule(token) - returns token release schedule

- Kadena Blockchain:
  - kadenacontext(query) - returns RAG context for general Kadena-related queries not realted to any specific on chain data
  - kadenafunctions.getBlock(hash) - returns information about a specific block
  - kadenafunctions.getBlocksFromDepth(minimumDepth, first) - returns blocks starting from given depth
  - kadenafunctions.getBlocksFromHeight(startHeight, first) - returns blocks starting from given height
  - kadenafunctions.getTransactions(filters) - returns filtered transactions
  - kadenafunctions.getTransactionsByPublicKey(publicKey, first, after) - returns transactions for a public key
  - kadenafunctions.getTransfers(accountName, chainId, first, after) - returns token transfers for an account
  - kadenafunctions.getEvents(filters) - returns filtered events

- Social Analysis:
  - getSocialData(token) - returns detailed social metrics including:
    * Topic rank and related topics
    * Post counts by platform (Twitter, YouTube, Reddit, TikTok, News)
    * Interaction counts by platform
    * Sentiment analysis by platform
    * 24h interaction totals
    * Number of contributors and total posts
    * Trend direction (up/down/flat)

- List and Category Data:
  - getListByCategory(sort, filter, limit) - returns filtered list of coins with metrics
    * sort: Field to sort by (e.g., 'social_dominance', 'market_cap', 'galaxy_score')
    * filter: Category filter (e.g., 'meme', 'defi', '')
    * limit: Number of results to return (default: 20)
    * Returns detailed metrics including:
      - Price and volume data
      - Market cap and dominance
      - Social metrics and sentiment
      - Galaxy Score and AltRank
      - Categories and blockchains

- News and Social Data:
  - getTopicNews(topic) - returns latest news articles for a topic with:
    * Article title, URL, and image
    * Publication date and sentiment score
    * Creator information (name, followers)
    * Interaction metrics (24h and total)
  - getSocialData(token) - returns detailed social metrics

- Token Metrics:
  - liquidity(token) - returns current liquidity in USD
  - liquidityChange24h(token) - returns 24h liquidity change percentage
  - offChainVolume(token) - returns off-chain volume in USD
  - volume7d(token) - returns 7-day volume in USD
  - volumeChange24h(token) - returns 24h volume change percentage

- Price Changes:
  - priceChange24h(token) - returns 24h price change percentage
  - priceChange1h(token) - returns 1h price change percentage
  - priceChange7d(token) - returns 7d price change percentage
  - priceChange1m(token) - returns 30d price change percentage

Example format:
\`\`\`javascript
const data = {
  currentPrice: await price("bitcoin"),
  priceHistory: await priceHistoryData("bitcoin", "30d"),
  socialMetrics: await getSocialData("bitcoin"),
  news: await getTopicNews("bitcoin"),
};
return data;
\`\`\`

Instructions:
1. Return only the raw data needed to answer the user's question
2. Do not perform any calculations or analysis
3. Format your response as JavaScript code that calls the necessary functions
4. For historical data, always specify the period needed
5. Always return the fetched data as a structured object
6. For questions about token performance, price movement, or trading decisions, always include:
   - Technical analysis (1d, 7d, and 30d periods)
   - Recent price changes
   - Market data (volume, liquidity, market cap)

When providing buy/sell ratings or analysis, incorporate the user's custom strategy and preferences
`;

    if (model === 'o3-mini') {
      // Use OpenAI
      const response = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [
          { 
            role: "system",
            content: systemContent
          },
          { role: "user", content: userInput }
        ],
      });

      return response.choices[0].message.content;

    } else if (model === 'io.net') {
      // Use io.net API
      const response = await axios.post(
        MODEL_CONFIG['io.net'].url,
        {
          model: MODEL_CONFIG['io.net'].model,
          reasoningContent: false,
          messages: [
            {
              role: "system",
              content: systemContent
            },
            {
              role: "user",
              content: userInput
            }
          ]
        },
        {
          headers: {
            'Authorization': `Bearer ${MODEL_CONFIG['io.net'].authToken}`
          }
        }
      );

      return response.data.choices[0].message.content;

    } else {
      throw new Error(`Unsupported model: ${model}`);
    }

  } catch (error) {
    console.error('Error calling AI API:', error);
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
};

/**
 * AI function to analyze data and provide insights
 * @param {string} userInput - The user's question
 * @param {object} executedData - Data fetched from API calls
 * @param {string} systemPrompt - System prompt for AI character
 * @param {string} model - The AI model to use
 * @returns {Promise<string>} - Analysis and insights
 */
const characterAPI = async (userInput, executedData, systemPrompt, model = 'o3-mini') => {
  try {
    if (!systemPrompt) {
      throw new Error('System prompt is required for character API');
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: `User Question: ${userInput}

Available Data:
${JSON.stringify(executedData, null, 2)}

Please analyze this data and provide insights that directly address the user's question.`
      }
    ];

    if (model === 'o3-mini') {
      const response = await openai.chat.completions.create({
        model: "o3-mini",
        messages: messages,
      });

      return response.choices[0].message.content;

    } else if (model === 'io.net') {
      const response = await axios.post(
        MODEL_CONFIG['io.net'].url,
        {
          model: MODEL_CONFIG['io.net'].model,
          reasoningContent: false,
          max_tokens: 70,
          messages: messages
        },
        {
          headers: {
            'Authorization': `Bearer ${MODEL_CONFIG['io.net'].authToken}`
          }
        }
      );

      return response.data.choices[0].message.content;
    }

  } catch (error) {
    console.error('Error calling AI Character API:', error);
    throw new Error('Failed to analyze data');
  }
};

/**
 * Execute data fetching code
 * @param {string} code - The code to execute
 * @returns {Promise<object>} - Executed data or error
 */
const executeCode = async (code) => {
  try {
    // Clean and validate the code input
    if (!code || typeof code !== 'string') {
      throw new Error('Invalid code input');
    }

    const cleanCode = code
      .replace(/```javascript\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    if (!cleanCode) {
      throw new Error('Empty code after cleaning');
    }

    // Create a safe context with allowed functions
    const context = {
      // Import all required functions and utilities
      ...require('../utils/calculationUtils'),
      ...require('../services/tokenServices'),
      
      // Add kadenafunctions to context
      kadenafunctions: require('../services/kadenaServices'),
      
      // Add kadenacontext to context
      kadenacontext: async (query) => await kadenacontext(query),
      
      // Add necessary constants
      TIME_PERIODS: {
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000
      },
      
      // Add portfolioAddresses to context
      portfolioAddresses: portfolioAddresses,

      // Add API functions
      ...require('../services/dataServices'),

      // Utility functions
      console: {
        log: (...args) => console.log(...args),
        error: (...args) => console.error(...args)
      }
    };

    // Create and execute async function with better error handling
    const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
    const fn = new AsyncFunction(...Object.keys(context), `
      try {
        // Ensure the code returns a value
        const result = await (async () => {
          ${cleanCode}
        })();
        
        // Handle undefined or null results
        if (result === undefined || result === null) {
          return { error: 'No data returned' };
        }
        
        return result;
      } catch (error) {
        console.error('Error in executed code:', error);
        return { error: error.message };
      }
    `);
    
    // Execute the function with the context
    const result = await fn(...Object.values(context));
    
    // Handle error results
    if (result && result.error) {
      throw new Error(result.error);
    }
    
    return result;
  } catch (error) {
    console.error('Error executing code:', error);
    // Return a structured error response instead of throwing
    return {
      error: true,
      message: error.message,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Main function to analyze a user query
 * @param {string} userInput - The user's question
 * @param {string} systemPrompt - System prompt for AI character
 * @param {string} model - The AI model to use
 * @returns {Promise<object>} - Analysis results
 */
const analyzeQuery = async (userInput, systemPrompt, model = 'o3-mini') => {
  try {
    if (!systemPrompt) {
      throw new Error('System prompt is required');
    }

    // Step 1: Get data fetching code from AI
    console.log('Step 1: Generating data fetching code...');
    const dataFetchingCode = await dataAPI(userInput, model);
    console.log('Data fetching code generated:', dataFetchingCode);
    if (!dataFetchingCode) {
      throw new Error('Failed to generate data fetching code');
    }

    // Step 2: Execute the code to fetch actual data
    console.log('Step 2: Executing data fetching code...');
    let executedData;
    try {
      executedData = await executeCode(dataFetchingCode);
      console.log('Executed data:', executedData);
    } catch (execError) {
      console.error('Warning: Data execution failed:', execError);
      executedData = {
        error: true,
        message: execError.message,
        partialData: {}
      };
    }

    // Step 3: Analyze the data using the specified model
    console.log('Step 3: Generating analysis and insights...');
    const analysis = await characterAPI(userInput, executedData, systemPrompt, model);
    console.log('Generated analysis:', analysis);
    if (!analysis) {
      throw new Error('Failed to generate analysis');
    }

    return {
      success: true,
      data: {
        rawData: executedData,
        analysis: analysis,
        debugInfo: {
          generatedCode: dataFetchingCode,
          systemPrompt: systemPrompt,
          model: model,
          timestamp: new Date().toISOString()
        }
      }
    };

  } catch (error) {
    console.error('Error in analysis pipeline:', error);
    return {
      success: false,
      error: {
        message: error.message,
        timestamp: new Date().toISOString(),
        details: error.stack
      }
    };
  }
};

module.exports = {
  dataAPI,
  characterAPI,
  executeCode,
  analyzeQuery,
  MODEL_CONFIG,
  openai
}; 