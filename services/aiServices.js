const axios = require('axios');
const OpenAI = require('openai');

// Get API key from various possible environment variable names
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;

// Initialize OpenAI with more robust API key handling
const openai = new OpenAI({
    apiKey: OPENAI_API_KEY
});

/**
 * Helper function to thoroughly sanitize think tags from AI responses
 * @param {string} text - The text to sanitize
 * @returns {string} - Sanitized text with all think tags removed
 */
const sanitizeThinkTags = (text) => {
  if (!text) return '';
  
  // Special handling for io.net format - extract only final response after all think tags
  const finalThinkTagIndex = text.lastIndexOf('</think>');
  if (finalThinkTagIndex !== -1) {
    const afterFinalThink = text.substring(finalThinkTagIndex + 8).trim();
    if (afterFinalThink) {
      return afterFinalThink;
    }
  }
  
  // Multiple passes to handle complex/nested tags
  let cleaned = text;
  
  // Handle different think tag variations and formats
  const patterns = [
    // Standard format with content
    /<think>[\s\S]*?<\/think>/g,
    // Nested or malformed tags
    /<think[\s\S]*?think>/g,
    // Handle variations with spaces or attributes
    /<\s*think\s*[^>]*>[\s\S]*?<\s*\/\s*think\s*>/g,
    // Single think tags without closing
    /<\s*think[^>]*?>/g,
    // Single closing think tags
    /<\/\s*think\s*>/g,
    // Any orphaned tags containing the word think
    /<[^>]*think[^>]*>/g
  ];
  
  // Apply each pattern
  patterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Multi-pass to catch deeply nested tags
  for (let i = 0; i < 3; i++) {
    let previousCleaned = cleaned;
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    // If no more changes, we can stop
    if (previousCleaned === cleaned) break;
  }
  
  return cleaned.trim();
};

// Model configuration
const MODEL_CONFIG = {
  'o3-mini': {
    type: 'openai',
    model: 'o3-mini'
  },
  'io.net': {
    type: 'io.net',
    model: 'deepseek-r1-distill-llama-70b',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    authToken: process.env.REACT_APP_GROQ_API_KEY || process.env.GROQ_API_KEY || ''
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
const dataAPI = async (userInput, model = 'io.net') => {
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
7. Always return the fetched data as a structured object

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
      // Use Groq API
      try {
        const response = await axios.post(
          MODEL_CONFIG['io.net'].url,
          {
            model: MODEL_CONFIG['io.net'].model,
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
              'Authorization': `Bearer ${MODEL_CONFIG['io.net'].authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Check for valid response before attempting to access content
        if (!response || !response.data || !response.data.choices || 
            !response.data.choices[0] || !response.data.choices[0].message) {
          console.error('Invalid response structure from Groq API:', response);
          throw new Error('Received invalid response structure from API');
        }

        // Get content from Groq API response
        let content = response.data.choices[0].message.content || '';
        
        return content;
      } catch (ioError) {
        console.error('Error in Groq API call:', ioError);
        throw new Error(`Groq API error: ${ioError.message}`);
      }

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
const characterAPI = async (userInput, executedData, systemPrompt, model = 'io.net') => {
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
      try {
        const response = await axios.post(
          MODEL_CONFIG['io.net'].url,
          {
            model: MODEL_CONFIG['io.net'].model,
            messages: messages
          },
          {
            headers: {
              'Authorization': `Bearer ${MODEL_CONFIG['io.net'].authToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        // Check for valid response before attempting to access content
        if (!response || !response.data || !response.data.choices || 
            !response.data.choices[0] || !response.data.choices[0].message) {
          console.error('Invalid response structure from Groq API:', response);
          throw new Error('Received invalid response structure from API');
        }

        // Get content from Groq API response
        let content = response.data.choices[0].message.content || '';
        
        return content;
      } catch (ioError) {
        console.error('Error in Groq API call:', ioError);
        throw new Error(`Groq API error: ${ioError.message}`);
      }
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

    // More aggressive cleaning of the code to remove explanatory text and ensure it's valid JavaScript
    let cleanCode = code;
    
    // Remove any markdown code blocks
    cleanCode = cleanCode.replace(/```javascript\n?/g, '').replace(/```\n?/g, '');
    
    // Remove any explanatory text before actual code - common in AI responses
    const asyncKeywords = ['const data', 'const result', 'return', 'async function', 'await'];
    const jsStartIndicators = asyncKeywords.map(keyword => cleanCode.indexOf(keyword)).filter(idx => idx !== -1);
    
    if (jsStartIndicators.length > 0) {
      // Find the first occurrence of an actual JavaScript keyword
      const firstCodeIdx = Math.min(...jsStartIndicators);
      if (firstCodeIdx > 0) {
        cleanCode = cleanCode.substring(firstCodeIdx);
      }
    }
    
    // Add a simple return if code doesn't have one
    if (!cleanCode.includes('return ')) {
      cleanCode = `${cleanCode.trim()}\nreturn data;`;
    }
    
    // Final cleanup and validation
    cleanCode = cleanCode.trim();
    if (!cleanCode) {
      throw new Error('Empty code after cleaning');
    }
    
    // Log cleaned code for debugging
    console.log('Cleaned code to execute:', cleanCode);

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
const analyzeQuery = async (userInput, systemPrompt, model = 'io.net') => {
  try {
    if (!systemPrompt) {
      throw new Error('System prompt is required');
    }

    // Step 1: Get data fetching code from AI
    console.log('Step 1: Generating data fetching code...');
    let dataFetchingCode;
    try {
      dataFetchingCode = await dataAPI(userInput, model);
      
      // Validate and sanitize code
      if (!dataFetchingCode || typeof dataFetchingCode !== 'string') {
        console.error('Invalid data fetching code returned:', dataFetchingCode);
        throw new Error('Failed to generate valid data fetching code');
      }
      
      const cleanedCode = sanitizeThinkTags(dataFetchingCode);
      console.log('Data fetching code generated:', cleanedCode);
      
      if (!cleanedCode.trim()) {
        throw new Error('Data fetching code was empty after sanitization');
      }
      
      dataFetchingCode = cleanedCode;
    } catch (codeGenError) {
      console.error('Error generating data fetching code:', codeGenError);
      throw new Error(`Failed to generate data fetching code: ${codeGenError.message}`);
    }

    // Step 2: Execute the code to fetch actual data
    console.log('Step 2: Executing data fetching code...');
    let executedData;
    try {
      executedData = await executeCode(dataFetchingCode);
      
      // Validate executed data
      if (!executedData) {
        executedData = { partialData: {} };
      }
      
      console.log('Executed data:', executedData);
    } catch (execError) {
      console.error('Warning: Data execution failed:', execError);
      executedData = { partialData: {} };
    }

    // Step 3: Analyze the data using the specified model
    console.log('Step 3: Generating analysis and insights...');
    let cleanedAnalysis;
    try {
      const rawAnalysis = await characterAPI(userInput, executedData, systemPrompt, model);
      
      // Validate and sanitize analysis
      if (!rawAnalysis || typeof rawAnalysis !== 'string') {
        console.error('Invalid analysis returned:', rawAnalysis);
        throw new Error('Failed to generate valid analysis');
      }
      
      cleanedAnalysis = sanitizeThinkTags(rawAnalysis);
      console.log('Generated analysis:', cleanedAnalysis);
      
      if (!cleanedAnalysis.trim()) {
        throw new Error('Analysis was empty after sanitization');
      }
    } catch (analysisError) {
      console.error('Error generating analysis:', analysisError);
      cleanedAnalysis = 'Analysis could not be generated at this time.';
    }

    // Create result object
    const result = {
      success: true,
      data: {
        rawData: executedData,
        analysis: cleanedAnalysis,
        debugInfo: {
          generatedCode: dataFetchingCode,
          systemPrompt: systemPrompt,
          model: model,
          timestamp: new Date().toISOString()
        }
      }
    };

    // Final thorough cleansing pass on the entire result to ensure no think tags remain
    try {
      const resultStr = JSON.stringify(result);
      const cleanedResultStr = sanitizeThinkTags(resultStr);
      return JSON.parse(cleanedResultStr);
    } catch (finalCleanError) {
      console.error('Error in final cleansing:', finalCleanError);
      // Fall back to the original result if JSON parsing fails
      return result;
    }

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