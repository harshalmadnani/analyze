const axios = require('axios');
const OpenAI = require('openai');
const coins = require('./coins.json');

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY
});

// Add portfolioAddresses if not defined
const portfolioAddresses = [
    "0x0000000000000000000000000000000000000000"
];

// Add LunarCrush API constant
const LUNARCRUSH_API_KEY = 'deb9mcyuk3wikmvo8lhlv1jsxnm6mfdf70lw4jqdk';

const kadenafunctions = {
  graphqlEndpoint: process.env.KADENA_GRAPHQL_ENDPOINT || 'https://api.mainnet.kadindexer.io/v0',
  graphqlApiKey: process.env.KADENA_GRAPHQL_KEY,
  
  // Configure request throttling and retry settings
  requestThrottleMs: parseInt(process.env.REQUEST_THROTTLE_MS) || 1000, // Default: 1 second between requests
  maxRetries: parseInt(process.env.MAX_RETRIES) || 3,  // Default: Maximum of 3 retries
  retryBackoffMultiplier: 2, // Exponential backoff multiplier
  
  /**
   * Helper function to delay execution
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} - Promise that resolves after delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * Execute a GraphQL query against the Kadindexer API with retry logic
   * @param {string} query - GraphQL query string
   * @param {object} variables - Variables for the query
   * @returns {Promise} - Promise with query results
   */
  async executeQuery(query, variables = {}) {
    let retries = 0;
    let waitTime = this.requestThrottleMs;
    
    while (true) {
      try {
        // Prepare headers with API key if available
        const headers = {
          'Content-Type': 'application/json',
        };
        
        // Add API key to headers if it exists
        if (this.graphqlApiKey) {
          headers['X-API-Key'] = this.graphqlApiKey;
        }
        
        // Wait before making the request to avoid rate limiting
        await this.delay(waitTime);
        
        const response = await axios.post(this.graphqlEndpoint, {
          query,
          variables
        }, { headers });
        
        if (response.data.errors) {
          throw new Error(response.data.errors[0].message);
        }
        
        return response.data.data;
      } catch (error) {
        // If we got a 429 Too Many Requests error and haven't exceeded retry limit
        if (error.response && error.response.status === 429 && retries < this.maxRetries) {
          retries++;
          // Use exponential backoff
          waitTime = waitTime * this.retryBackoffMultiplier;
          console.log(`Rate limit hit. Retrying in ${waitTime}ms... (Attempt ${retries}/${this.maxRetries})`);
          continue;
        }
        
        console.error('GraphQL query error:', error.message);
        throw error;
      }
    }
  },

  /**
   * Get a specific block by its hash
   * @param {string} hash - The hash of the block to retrieve
   * @returns {Promise} - Promise with block data
   */
  async getBlock(hash) {
    const query = `
      query GetBlock($hash: String!) {
        block(hash: $hash) {
          hash
          height
          minerAccount {
            accountName
          }
          transactions {
            edges {
              node {
                id
                hash
              }
            }
          }
          events {
            edges {
              node {
                id
                qualifiedName
              }
            }
          }
          creationTime
        }
      }
    `;
    
    return this.executeQuery(query, { hash });
  },

  /**
   * Get blocks starting from a specific depth
   * @param {number} minimumDepth - How far back from the latest block to start 
   * @param {number} first - Number of blocks to retrieve
   * @returns {Promise} - Promise with blocks data
   */
  async getBlocksFromDepth(minimumDepth, first = 20) {
    const query = `
      query GetBlocksFromDepth($minimumDepth: Int!, $first: Int) {
        blocksFromDepth(minimumDepth: $minimumDepth, first: $first) {
          edges {
            node {
              hash
              height
              minerAccount {
                accountName
              }
              transactions {
                edges {
                  node {
                    id
                    hash
                  }
                }
              }
              creationTime
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
          }
        }
      }
    `;
    
    return this.executeQuery(query, { minimumDepth, first });
  },

  /**
   * Get blocks starting from a specific height
   * @param {number} startHeight - The block height to start from
   * @param {number} first - Number of blocks to retrieve
   * @returns {Promise} - Promise with blocks data
   */
  async getBlocksFromHeight(startHeight, first = 20) {
    const query = `
      query GetBlocksFromHeight($startHeight: Int!, $first: Int) {
        blocksFromHeight(startHeight: $startHeight, first: $first) {
          edges {
            node {
              hash
              height
              minerAccount {
                accountName
              }
              transactions {
                edges {
                  node {
                    id
                    hash
                  }
                }
              }
              creationTime
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            endCursor
          }
        }
      }
    `;
    
    return this.executeQuery(query, { startHeight, first });
  },

  /**
   * Get transactions with optional filtering
   * @param {object} filters - Object containing filter parameters
   * @returns {Promise} - Promise with transactions data
   */
  async getTransactions(filters = {}) {
    const query = `
      query GetTransactions(
        $accountName: String
        $blockHash: String
        $chainId: String
        $requestKey: String
        $first: Int
        $after: String
        $maxHeight: Int
        $minHeight: Int
        $minimumDepth: Int
      ) {
        transactions(
          accountName: $accountName
          blockHash: $blockHash
          chainId: $chainId
          requestKey: $requestKey
          first: $first
          after: $after
          maxHeight: $maxHeight
          minHeight: $minHeight
          minimumDepth: $minimumDepth
        ) {
          edges {
            node {
              hash
              cmd {
                meta {
                  chainId
                  gasPrice
                  sender
                }
              }
              result {
                ... on TransactionResult {
                  gas
                  gasUsed
                }
              }
              block {
                height
                hash
              }
              creationTime
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    
    return this.executeQuery(query, filters);
  },

  /**
   * Get transactions by public key
   * @param {string} publicKey - The public key to query transactions for
   * @param {number} first - Number of transactions to retrieve
   * @param {string} after - Cursor for pagination
   * @returns {Promise} - Promise with transactions data
   */
  async getTransactionsByPublicKey(publicKey, first = 10, after = null) {
    const query = `
      query GetTransactionsByPublicKey($publicKey: String!, $first: Int, $after: String) {
        transactionsByPublicKey(publicKey: $publicKey, first: $first, after: $after) {
          edges {
            node {
              hash
              cmd {
                meta {
                  chainId
                  gasPrice
                  sender
                }
              }
              result {
                ... on TransactionResult {
                  gas
                  gasUsed
                }
              }
              block {
                height
                hash
              }
              creationTime
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    
    return this.executeQuery(query, { publicKey, first, after });
  },

  /**
   * Get token transfers for an account
   * @param {string} accountName - The account name to query transfers for
   * @param {string} chainId - The chain ID to query
   * @param {number} first - Number of transfers to retrieve
   * @param {string} after - Cursor for pagination
   * @returns {Promise} - Promise with transfers data
   */
  async getTransfers(accountName, chainId, first = 10, after = null) {
    const query = `
      query GetTransfers($accountName: String!, $chainId: String!, $first: Int, $after: String) {
        transfers(accountName: $accountName, chainId: $chainId, first: $first, after: $after) {
          edges {
            node {
              amount
              block {
                height
                hash
              }
              creationTime
              receiverAccount
              senderAccount
              transaction {
                hash
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    
    return this.executeQuery(query, { accountName, chainId, first, after });
  },

  /**
   * Get events with optional filtering
   * @param {object} filters - Object containing filter parameters
   * @returns {Promise} - Promise with events data
   */
  async getEvents(filters = {}) {
    const query = `
      query GetEvents(
        $accountName: String
        $blockHash: String
        $chainId: String
        $first: Int
        $after: String
        $maxHeight: Int
        $minHeight: Int
        $minimumDepth: Int
        $qualifiedName: String
        $pactId: String
      ) {
        events(
          accountName: $accountName
          blockHash: $blockHash
          chainId: $chainId
          first: $first
          after: $after
          maxHeight: $maxHeight
          minHeight: $minHeight
          minimumDepth: $minimumDepth
          qualifiedName: $qualifiedName
          pactId: $pactId
        ) {
          edges {
            node {
              id
              qualifiedName
              name
              moduleHash
              module {
                name
              }
              params
              block {
                height
                hash
              }
              transaction {
                hash
              }
              creationTime
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    
    return this.executeQuery(query, filters);
  },

  /**
   * Get fungible account information
   * @param {string} accountName - The account name to query
   * @param {string} chainId - The chain ID to query
   * @returns {Promise} - Promise with fungible account data
   */
  async getFungibleAccount(accountName, chainId) {
    const query = `
      query GetFungibleAccount($accountName: String!) {
        fungibleAccount(accountName: $accountName) {
          accountName
          account {
            guard {
              keySet {
                keys
                pred
              }
            }
          }
          chainId
          balances {
            edges {
              node {
                amount
                token {
                  id
                  name
                  fungible {
                    supply
                    decimals
                  }
                }
              }
            }
          }
          tokens {
            edges {
              node {
                token {
                  id
                  name
                  fungible {
                    supply
                    decimals
                  }
                }
              }
            }
          }
        }
      }
    `;
    
    return this.executeQuery(query, { accountName });
  },

  /**
   * Get fungible account information by public key
   * @param {string} publicKey - The public key to query
   * @param {string} chainId - The chain ID to query
   * @param {number} first - Number of accounts to retrieve
   * @param {string} after - Cursor for pagination
   * @returns {Promise} - Promise with fungible account data
   */
  async getFungibleAccountByPublicKey(publicKey, chainId, first = 10, after = null) {
    const query = `
      query GetFungibleAccountByPublicKey($publicKey: String!, $chainId: String!, $first: Int, $after: String) {
        fungibleAccountsByPublicKey(publicKey: $publicKey, chainId: $chainId, first: $first, after: $after) {
          edges {
            node {
              accountName
              account {
                guard {
                  keySet {
                    keys
                    pred
                  }
                }
              }
              chainId
              balances {
                edges {
                  node {
                    amount
                    token {
                      id
                      name
                      fungible {
                        supply
                        decimals
                      }
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;
    
    return this.executeQuery(query, { publicKey, chainId, first, after });
  },

  /**
   * Helper function to paginate through all results
   * @param {function} queryFunction - The function to call for each page
   * @param {object} initialParams - Initial parameters for the query
   * @param {number} maxPages - Maximum number of pages to retrieve (default: Infinity)
   * @returns {Promise<Array>} - Promise with all combined results
   */
  async paginateAll(queryFunction, initialParams, maxPages = Infinity) {
    let results = [];
    let params = { ...initialParams };
    let hasNextPage = true;
    let pageCount = 0;
    
    while (hasNextPage && pageCount < maxPages) {
      const data = await queryFunction(params);
      
      // Extract the actual result key (first property in the data object)
      const resultKey = Object.keys(data)[0];
      const edges = data[resultKey].edges;
      
      // Add the current page results
      results = results.concat(edges.map(edge => edge.node));
      
      // Check if there are more pages
      hasNextPage = data[resultKey].pageInfo.hasNextPage;
      
      // Update params with the endCursor for the next page
      if (hasNextPage) {
        params.after = data[resultKey].pageInfo.endCursor;
      }
      
      pageCount++;
    }
    
    return results;
  }
};
// API Functions
const fetchPriceHistory = async (coinname, from = null, to = null) => {
  const response = await axios.get(`https://api.mobula.io/api/1/market/history`, {
    params: {
      asset: coinname,
      from: from,
      to: to,
    },
    headers: {
      Authorization: process.env.MOBULA_API_KEY || 'e26c7e73-d918-44d9-9de3-7cbe55b63b99'
    }
  });
  return response.data?.data?.price_history;
};

const fetchCryptoPanicData = async (coinname) => {
  const response = await axios.get(`https://cryptopanic.com/api/free/v1/posts/`, {
    params: {
      auth_token: process.env.CRYPTOPANIC_API_KEY || '2c962173d9c232ada498efac64234bfb8943ba70',
      public: 'true',
      currencies: coinname
    }
  });
  return response.data?.results;
};

const fetchMarketData = async (coinname) => {
  const response = await axios.get(`https://api.mobula.io/api/1/market/data?asset=${coinname}`, {
    headers: {
      Authorization: 'e26c7e73-d918-44d9-9de3-7cbe55b63b99'
    }
  });
  return response.data?.data;
};

const fetchMetadata = async (coinname) => {
  const response = await axios.get(`https://api.mobula.io/api/1/metadata?asset=${coinname}`, {
    headers: {
      Authorization: 'e26c7e73-d918-44d9-9de3-7cbe55b63b99'
    }
  });
  return response.data?.data;
};

const fetchHistoricPortfolioData = async (from, to, addresses) => {
  const response = await axios.get(`https://api.mobula.io/api/1/wallet/history`, {
    params: {
      wallets: addresses.join(','),
      from: from,
      to: to
    },
    headers: {
      Authorization: 'e26c7e73-d918-44d9-9de3-7cbe55b63b99'
    }
  });
  return response.data;
};

const fetchWalletPortfolio = async (address) => {
  const response = await axios.get(`https://api.mobula.io/api/1/wallet/multi-portfolio`, {
    params: {
      wallets: address
    },
    headers: {
      Authorization: 'e26c7e73-d918-44d9-9de3-7cbe55b63b99'
    }
  });
  return response.data?.data[0];
};

// Helper Functions
const getTokenName = (input) => {
  const lowercaseInput = input.toLowerCase();
  const matchedCoin = coins.find(coin => 
    coin.name.toLowerCase() === lowercaseInput || 
    coin.symbol.toLowerCase() === lowercaseInput
  );
  return matchedCoin ? matchedCoin.name.toLowerCase() : lowercaseInput;
};

const calculateSMA = (prices, period) => {
  const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
};

const calculateRSI = (prices, period) => {
  let gains = 0;
  let losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const difference = prices[i] - prices[i - 1];
    if (difference >= 0) gains += difference;
    else losses -= difference;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateMACD = (prices) => {
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = ema12 - ema26;
  const signalLine = calculateEMA([macdLine], 9);
  const histogram = macdLine - signalLine;
  return { macdLine, signalLine, histogram };
};

const calculateEMA = (prices, period) => {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  return ema;
};

const determineTrend = (sma, rsi, macd) => {
  let signals = [];
  if (rsi > 70) signals.push('Overbought');
  else if (rsi < 30) signals.push('Oversold');
  if (macd.macdLine > macd.signalLine) signals.push('Bullish MACD Crossover');
  else if (macd.macdLine < macd.signalLine) signals.push('Bearish MACD Crossover');
  return signals.join(', ') || 'Neutral';
};

const calculateVolatility = (values) => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance);
};

const calculateTrend = (values) => {
  const firstValue = values[0];
  const lastValue = values[values.length - 1];
  const change = ((lastValue - firstValue) / firstValue) * 100;
  if (change > 5) return 'Upward';
  if (change < -5) return 'Downward';
  return 'Sideways';
};



// Constants
const API_KEYS = {
  MOBULA: process.env.MOBULA_API_KEY || 'e26c7e73-d918-44d9-9de3-7cbe55b63b99',
  CRYPTOPANIC: process.env.CRYPTOPANIC_API_KEY || '2c962173d9c232ada498efac64234bfb8943ba70'
};

const TIME_PERIODS = {
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '1y': 365 * 24 * 60 * 60 * 1000
};

// Token Information Functions
const website = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  return metadata?.website || 'N/A';
};

const twitter = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  return metadata?.twitter || 'N/A';
};

const telegram = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  return metadata?.telegram || 'N/A';
};

const discord = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  return metadata?.discord || 'N/A';
};

const description = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  return metadata?.description || 'N/A';
};

// Market Data Functions
const price = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data?.price !== undefined ? `$${data.price.toFixed(2)}` : 'N/A';
};

const volume = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data?.volume !== undefined ? `$${data.volume.toFixed(2)}` : 'N/A';
};

const marketCap = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data?.market_cap !== undefined ? `$${data.market_cap.toFixed(2)}` : 'N/A';
};

const marketCapDiluted = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `$${data?.market_cap_diluted?.toFixed(2) || 'N/A'}`;
};

// Token Metrics Functions
const liquidity = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `$${data?.liquidity?.toFixed(2) || 'N/A'}`;
};

const liquidityChange24h = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data?.liquidity_change_24h ? `${data.liquidity_change_24h.toFixed(2)}%` : 'N/A';
};

const offChainVolume = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `$${data?.off_chain_volume?.toFixed(2) || 'N/A'}`;
};

const volume7d = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `$${data?.volume_7d?.toFixed(2) || 'N/A'}`;
};

// Price Change Functions
const volumeChange24h = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `${data?.volume_change_24h?.toFixed(2) || 'N/A'}%`;
};

const priceChange24h = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `${data?.price_change_24h?.toFixed(2) || 'N/A'}%`;
};

const priceChange1h = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `${data?.price_change_1h?.toFixed(2) || 'N/A'}%`;
};

const priceChange7d = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `${data?.price_change_7d?.toFixed(2) || 'N/A'}%`;
};

const priceChange1m = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `${data?.price_change_1m?.toFixed(2) || 'N/A'}%`;
};

// Add missing priceChange30d function (alias for priceChange1m)
const priceChange30d = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `${data?.price_change_1m?.toFixed(2) || 'N/A'}%`;
};

const priceChange1y = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `${data?.price_change_1y?.toFixed(2) || 'N/A'}%`;
};

// Token Stats Functions
const ath = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `$${data?.ath?.toFixed(2) || 'N/A'}`;
};

const atl = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return `$${data?.atl?.toFixed(2) || 'N/A'}`;
};

const rank = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data?.rank || 'N/A';
};

const totalSupply = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data?.total_supply || 'N/A';
};

const circulatingSupply = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data?.circulating_supply || 'N/A';
};

// Advanced Token Analysis Functions
const cexs = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  
  if (!metadata?.cexs || !Array.isArray(metadata.cexs)) {
    return 'No CEX listing information available';
  }
  
  const formattedCexs = metadata.cexs
    .filter(cex => cex.id)
    .map(cex => ({
      name: cex.name || cex.id,
      logo: cex.logo || null
    }));

  return {
    totalListings: formattedCexs.length,
    exchanges: formattedCexs
  };
};

const investors = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  
  if (!metadata?.investors || !Array.isArray(metadata.investors)) {
    return 'No investor information available';
  }
  
  const formattedInvestors = metadata.investors.map(investor => ({
    name: investor.name,
    type: investor.type,
    isLead: investor.lead,
    country: investor.country_name || 'Unknown',
    image: investor.image
  }));

  return {
    totalInvestors: formattedInvestors.length,
    leadInvestors: formattedInvestors.filter(inv => inv.isLead).map(inv => inv.name),
    vcInvestors: formattedInvestors.filter(inv => inv.type === 'Ventures Capital').length,
    angelInvestors: formattedInvestors.filter(inv => inv.type === 'Angel Investor').length,
    allInvestors: formattedInvestors
  };
};

const distribution = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  
  if (!metadata?.distribution || !Array.isArray(metadata.distribution)) {
    return 'No distribution information available';
  }
  
  return metadata.distribution.map(item => ({
    category: item.name,
    percentage: item.percentage
  }));
};

const releaseSchedule = async (token) => {
  const normalizedToken = getTokenName(token);
  const metadata = await fetchMetadata(normalizedToken);
  
  if (!metadata?.release_schedule || !Array.isArray(metadata.release_schedule)) {
    return 'No release schedule information available';
  }
  
  const schedule = metadata.release_schedule.map(item => ({
    date: new Date(item.unlock_date).toISOString(),
    tokensToUnlock: item.tokens_to_unlock,
    allocation: item.allocation_details
  }));

  return {
    totalTokensInSchedule: schedule.reduce((sum, item) => sum + item.tokensToUnlock, 0),
    totalUnlockEvents: schedule.length,
    upcomingUnlocks: schedule
      .filter(item => new Date(item.date) > new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5),
    fullSchedule: schedule
  };
};

// Add missing priceHistoryData function
const priceHistoryData = async (token, period) => {
  const normalizedToken = getTokenName(token);
  const now = Date.now();
  const from = now - TIME_PERIODS[period];
  return await fetchPriceHistory(normalizedToken, from, now);
};

// Add missing getHistoricPortfolioData function
const getHistoricPortfolioData = async (addresses, period) => {
  const now = Date.now();
  const from = now - TIME_PERIODS[period];
  return await fetchHistoricPortfolioData(from, now, addresses);
};

// Add missing isListed function
const isListed = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data ? 'Listed' : 'Not Listed';
};

// Add missing getPriceHistory function (wrapper for fetchPriceHistory)
const getPriceHistory = async (token, period) => {
  const normalizedToken = getTokenName(token);
  const now = Date.now();
  const from = now - TIME_PERIODS[period];
  return await fetchPriceHistory(normalizedToken, from, now);
};

// Add social data function
const getSocialData = async (token) => {
  try {
    const normalizedToken = getTokenName(token);
    const response = await axios.get(`https://lunarcrush.com/api4/public/topic/${normalizedToken}/v1`, {
      headers: {
        'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
      }
    });

    const socialData = response.data?.data;
    if (!socialData) {
      return 'No social data available';
    }

    return {
      topic: socialData.topic,
      title: socialData.title,
      topicRank: socialData.topic_rank,
      relatedTopics: socialData.related_topics,
      postCounts: socialData.types_count,
      interactions: {
        total24h: socialData.interactions_24h,
        byType: socialData.types_interactions,
      },
      sentiment: {
        byType: socialData.types_sentiment,
        details: socialData.types_sentiment_detail,
      },
      contributors: socialData.num_contributors,
      totalPosts: socialData.num_posts,
      categories: socialData.categories,
      trend: socialData.trend,
    };
  } catch (error) {
    console.error('Error fetching social data:', error);
    return 'Failed to fetch social data';
  }
};

// Move getListByCategory function definition before it's used
const getListByCategory = async (sort = 'social_dominance', filter = '', limit = 20) => {
  try {
    const response = await axios.get('https://lunarcrush.com/api4/public/coins/list/v2', {
      params: {
        sort,
        filter,
        limit
      },
      headers: {
        'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
      }
    });

    if (!response.data?.data) {
      throw new Error('No data received from LunarCrush API');
    }

    // Transform the data to a more usable format
    return response.data.data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      price: {
        usd: coin.price,
        btc: coin.price_btc
      },
      volume24h: coin.volume_24h,
      volatility: coin.volatility,
      supply: {
        circulating: coin.circulating_supply,
        max: coin.max_supply
      },
      priceChange: {
        '1h': coin.percent_change_1h,
        '24h': coin.percent_change_24h,
        '7d': coin.percent_change_7d,
        '30d': coin.percent_change_30d
      },
      marketCap: {
        value: coin.market_cap,
        rank: coin.market_cap_rank,
        dominance: coin.market_dominance,
        previousDominance: coin.market_dominance_prev
      },
      social: {
        interactions24h: coin.interactions_24h,
        volume24h: coin.social_volume_24h,
        dominance: coin.social_dominance,
        sentiment: coin.sentiment
      },
      scores: {
        galaxy: {
          current: coin.galaxy_score,
          previous: coin.galaxy_score_previous
        },
        altRank: {
          current: coin.alt_rank,
          previous: coin.alt_rank_previous
        }
      },
      categories: coin.categories ? coin.categories.split(',') : [],
      blockchains: coin.blockchains,
      topic: coin.topic,
      logo: coin.logo,
      lastUpdated: {
        price: coin.last_updated_price,
        source: coin.last_updated_price_by
      }
    }));
  } catch (error) {
    console.error('Error fetching coin list:', error);
    throw new Error(`Failed to fetch coin list: ${error.message}`);
  }
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

// Update dataAPI function to handle both models
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

// Code Execution Function
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
      // Add default coins array to context
      coins: [
        { name: 'bitcoin', symbol: 'btc' },
        { name: 'ethereum', symbol: 'eth' },
        { name: 'aptos', symbol: 'apt' },
        { name: 'binance coin', symbol: 'bnb' },
        { name: 'cardano', symbol: 'ada' },
        { name: 'solana', symbol: 'sol' },
        { name: 'ripple', symbol: 'xrp' },
        { name: 'polkadot', symbol: 'dot' },
        // Add more default coins as needed
      ],
      
      // Add kadenafunctions to context
      kadenafunctions: kadenafunctions,
      
      getTokenName: (input) => {
        const lowercaseInput = input.toLowerCase();
        const matchedCoin = context.coins.find(coin => 
          coin.name.toLowerCase() === lowercaseInput || 
          coin.symbol.toLowerCase() === lowercaseInput
        );
        return matchedCoin ? matchedCoin.name.toLowerCase() : lowercaseInput;
      },
      
      // Market Data Functions
      price: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price ? `$${data.price.toFixed(2)}` : 'N/A';
      },
      volume: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.volume ? `$${data.volume.toFixed(2)}` : 'N/A';
      },
      marketCap: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.market_cap ? `$${data.market_cap.toFixed(2)}` : 'N/A';
      },
      marketCapDiluted: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.market_cap_diluted ? `$${data.market_cap_diluted.toFixed(2)}` : 'N/A';
      },
      liquidity: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.liquidity ? `$${data.liquidity.toFixed(2)}` : 'N/A';
      },
      
      // Price Change Functions
      priceChange24h: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_24h ? `${data.price_change_24h.toFixed(2)}%` : 'N/A';
      },
      priceChange1h: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_1h ? `${data.price_change_1h.toFixed(2)}%` : 'N/A';
      },
      priceChange7d: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_7d ? `${data.price_change_7d.toFixed(2)}%` : 'N/A';
      },

      // Historical Data Functions
      getPriceHistory: async (token, period) => {
        return await fetchPriceHistory(token, period);
      },
      getHistoricPortfolioData: async (addresses, period) => {
        return await fetchHistoricPortfolioData(addresses, period);
      },
      getWalletPortfolio: async (address) => {
        return await fetchWalletPortfolio(address);
      },

      // Social Info Functions
      website: async (token) => {
        const metadata = await fetchMetadata(token);
        return metadata?.website || 'N/A';
      },
      twitter: async (token) => {
        const metadata = await fetchMetadata(token);
        return metadata?.twitter || 'N/A';
      },
      telegram: async (token) => {
        const metadata = await fetchMetadata(token);
        return metadata?.telegram || 'N/A';
      },
      discord: async (token) => {
        const metadata = await fetchMetadata(token);
        return metadata?.discord || 'N/A';
      },
      description: async (token) => {
        const metadata = await fetchMetadata(token);
        return metadata?.description || 'N/A';
      },

      // Advanced Analysis Functions
      cexs: async (token) => {
        return await cexs(token);
      },
      investors: async (token) => {
        return await investors(token);
      },
      distribution: async (token) => {
        return await distribution(token);
      },
      releaseSchedule: async (token) => {
        return await releaseSchedule(token);
      },

      // Utility Functions
      console: {
        log: (...args) => console.log(...args),
        error: (...args) => console.error(...args)
      },

      // Add missing functions to context
      priceChange30d: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_1m ? `${data.price_change_1m.toFixed(2)}%` : 'N/A';
      },
      
      priceHistoryData: async (token, period) => {
        const normalizedToken = context.getTokenName(token);
        const now = Date.now();
        const from = now - TIME_PERIODS[period];
        return await fetchPriceHistory(normalizedToken, from, now);
      },
      
      liquidityChange24h: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.liquidity_change_24h ? `${data.liquidity_change_24h.toFixed(2)}%` : 'N/A';
      },
      
      offChainVolume: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.off_chain_volume ? `$${data.off_chain_volume.toFixed(2)}` : 'N/A';
      },
      
      volume7d: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.volume_7d ? `$${data.volume_7d.toFixed(2)}` : 'N/A';
      },
      
      volumeChange24h: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.volume_change_24h ? `${data.volume_change_24h.toFixed(2)}%` : 'N/A';
      },
      
      priceChange1m: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_1m ? `${data.price_change_1m.toFixed(2)}%` : 'N/A';
      },
      
      priceChange1y: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_1y ? `${data.price_change_1y.toFixed(2)}%` : 'N/A';
      },
      
      ath: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.ath ? `$${data.ath.toFixed(2)}` : 'N/A';
      },
      
      atl: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.atl ? `$${data.atl.toFixed(2)}` : 'N/A';
      },
      
      rank: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.rank || 'N/A';
      },
      
      totalSupply: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.total_supply || 'N/A';
      },
      
      circulatingSupply: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.circulating_supply || 'N/A';
      },
      
      isListed: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data ? 'Listed' : 'Not Listed';
      },
      
      // Add TIME_PERIODS to context
      TIME_PERIODS: {
        '1d': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        '1y': 365 * 24 * 60 * 60 * 1000
      },
      
      // Add portfolioAddresses to context
      portfolioAddresses: portfolioAddresses,

      // Add getSocialData function to context
      getSocialData: async (token) => await getSocialData(token),

      // Add getListByCategory to context
      getListByCategory: async (sort = 'social_dominance', filter = '', limit = 20) => 
        await getListByCategory(sort, filter, limit),

      // Add getTopicNews to context
      getTopicNews: async (topic) => {
        try {
          const response = await axios.get(`https://lunarcrush.com/api4/public/topic/${topic}/news/v1`, {
            headers: {
              'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
            }
          });

          if (!response.data?.data) {
            return 'No news data available';
          }

          return response.data.data.map(item => ({
            id: item.id,
            type: item.post_type,
            title: item.post_title,
            url: item.post_link,
            image: item.post_image,
            created: new Date(item.post_created * 1000).toISOString(),
            sentiment: item.post_sentiment,
            creator: {
              id: item.creator_id,
              name: item.creator_name,
              displayName: item.creator_display_name,
              followers: item.creator_followers,
              avatar: item.creator_avatar
            },
            interactions: {
              last24h: item.interactions_24h,
              total: item.interactions_total
            }
          }));
        } catch (error) {
          console.error('Error fetching topic news:', error);
          return 'Failed to fetch news data';
        }
      },

      // Add Token Metrics Functions
      liquidity: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return `$${data?.liquidity?.toFixed(2) || 'N/A'}`;
      },
      
      liquidityChange24h: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.liquidity_change_24h ? `${data.liquidity_change_24h.toFixed(2)}%` : 'N/A';
      },
      
      offChainVolume: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.off_chain_volume ? `$${data.off_chain_volume.toFixed(2)}` : 'N/A';
      },
      
      volume7d: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.volume_7d ? `$${data.volume_7d.toFixed(2)}` : 'N/A';
      },
      
      volumeChange24h: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.volume_change_24h ? `${data.volume_change_24h.toFixed(2)}%` : 'N/A';
      },
      
      priceChange1m: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_1m ? `${data.price_change_1m.toFixed(2)}%` : 'N/A';
      },
      
      priceChange1y: async (token) => {
        const normalizedToken = context.getTokenName(token);
        const data = await fetchMarketData(normalizedToken);
        return data?.price_change_1y ? `${data.price_change_1y.toFixed(2)}%` : 'N/A';
      },

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

// Update characterAPI function similarly
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

// Update analyzeQuery function to accept model parameter
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

// Add getKadenaBalance function definition

// Move all exports to the end of the file
module.exports = {
    analyzeQuery,
    executeCode,
    dataAPI,
    characterAPI,
    priceHistoryData,
    priceChange30d,
    getSocialData,
    getListByCategory,
    // ... other exports ...
};

// Example usage:
// const response = await analyzeQuery("What's the current state of Bitcoin?");
// if (response.success) {
//   console.log(response.data.analysis);
// } else {
//   console.error(response.error.message);
// }


