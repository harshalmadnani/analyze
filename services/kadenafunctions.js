// Kadena API functions for interfacing with Kadindexer GraphQL API
const axios = require('axios');

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
      query GetFungibleAccount($accountName: String!, $chainId: String!) {
        fungibleAccount(accountName: $accountName, chainId: $chainId) {
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
    
    return this.executeQuery(query, { accountName, chainId });
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

module.exports = kadenafunctions;