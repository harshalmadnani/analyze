// Test file for kadenafunctions.js
require('dotenv').config(); // Load environment variables from .env file
const kadenafunctions = require('./kadenafunctions');

// Override default settings for testing to be more conservative
kadenafunctions.requestThrottleMs = parseInt(process.env.REQUEST_THROTTLE_MS) || 2000; // 2 seconds between requests
kadenafunctions.maxRetries = parseInt(process.env.MAX_RETRIES) || 3;

// Sample test data from Kadena blockchain
const SAMPLE_DATA = {
  publicKeys: [
    '39afdb5bc044fb38e9168a564eba7504a4a392fb97c4210bf8234f92fc6ffe28',
    '7cf31b94a573d10d9d2d882c9b97565b3d1826e873d0034cbe8ef2fba6dc31f2',
    '9e9bb7c2d5fe38d1b62a756967e9348415a871bb496f256c0d7ac60d7376706f'
  ],
  accounts: [
    'k:568b91402616558c404a13773ed76499ac29a96e305207387940cb4c449d36a3',
    'k:37d52c0cd202f1ec5ae3646f7f8a530e228698f17ceb13259da0ec9aca5f7ad2',
    'k:4809b55a6463705b9ffef23424ae9f1dad5415e8eae18891812eff57a0ff44bd'
  ],
  requestKeys: [
    'IWT1_uxLCZKZN_LW_2WiW0Tz174PPpW8QinaRyMuWWg',
    'vKUsmtPW5nSBKgWdXOJFJmuscCFAxRFuyAJLhnXvRPY',
    'MdUKisfXfI4BaIBurxIRIGwT9CD3Cdx9q-8zNEgdkRw'
  ],
  blockHashes: [
    'KOnaAyYdQEVUehFHwJtN23hBV4lODKhmA399RmJqeQw',
    '97b488544eab20ccc192d26e9b41ad158ab2ec2c9efa2765c135732ccd6ece8b',
    '615919fe2c17e20a1e22997de95a887f3d19a033eb27a6f119913e2e84a4217c'
  ],
  eventNames: [
    'coin.TRANSFER'
  ],
  chainIds: ['0', '1', '2']
};

// Helper function to run tests
async function runTest(testName, testFunction) {
  console.log(`\n----- Running test: ${testName} -----`);
  try {
    const result = await testFunction();
    console.log('Test result:', JSON.stringify(result, null, 2));
    console.log(`✅ Test ${testName} passed`);
    return result;
  } catch (error) {
    console.error(`❌ Test ${testName} failed:`, error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('Starting Kadena API functions tests...');
  console.log(`Using API endpoint: ${kadenafunctions.graphqlEndpoint}`);
  console.log(`API Key configured: ${kadenafunctions.graphqlApiKey ? 'Yes' : 'No'}`);
  console.log(`Request throttle: ${kadenafunctions.requestThrottleMs}ms between requests`);

  // Get a sample block hash to use
  const blockHash = SAMPLE_DATA.blockHashes[0];
  
  // Test 1: Get a specific block
  await runTest(`Get specific block with hash ${blockHash}`, async () => {
    return await kadenafunctions.getBlock(blockHash);
  });

  // Test 2: Get blocks from depth (a small number)
  await runTest('Get blocks from depth', async () => {
    return await kadenafunctions.getBlocksFromDepth(5, 1); // Only get 1 block to be conservative
  });

  // Test 3: Get blocks from height
  let blockHeight = parseInt(process.env.TEST_BLOCK_HEIGHT || '8000000'); // Use environment variable or default
  await runTest(`Get blocks from height ${blockHeight}`, async () => {
    return await kadenafunctions.getBlocksFromHeight(blockHeight, 1); // Only get 1 block
  });

  // Test 4: Get transactions with filters (limit to 2)
  await runTest('Get transactions with filters', async () => {
    return await kadenafunctions.getTransactions({
      first: 2,
      requestKey: SAMPLE_DATA.requestKeys[0]
    });
  });

  // Test 5: Get transactions by public key
  const testPublicKey = SAMPLE_DATA.publicKeys[0];
  await runTest(`Get transactions by public key ${testPublicKey}`, async () => {
    return await kadenafunctions.getTransactionsByPublicKey(testPublicKey, 2); // Only get 2 transactions
  });

  // Test 6: Get transfers for an account
  const testAccount = SAMPLE_DATA.accounts[0];
  const chainId = SAMPLE_DATA.chainIds[0];
  await runTest(`Get transfers for account ${testAccount} on chain ${chainId}`, async () => {
    return await kadenafunctions.getTransfers(testAccount, chainId, 2); // Only get 2 transfers
  });

  // Test 7: Get events with filters (limit to 2)
  await runTest('Get events with filters', async () => {
    return await kadenafunctions.getEvents({
      first: 2,
      accountName: testAccount,
      chainId: chainId,
      qualifiedName: SAMPLE_DATA.eventNames[0]
    });
  });

  // Test 8: Get fungible account
  await runTest(`Get fungible account for ${testAccount} on chain ${chainId}`, async () => {
    return await kadenafunctions.getFungibleAccount(testAccount, chainId);
  });

  // Test 9: Get fungible accounts by public key
  await runTest(`Get fungible accounts by public key ${testPublicKey} on chain ${chainId}`, async () => {
    return await kadenafunctions.getFungibleAccountByPublicKey(testPublicKey, chainId, 2); // Only get 2 accounts
  });

  // Test 10: Pagination helper (limit to 1 page with 2 items)
  await runTest('Test pagination helper', async () => {
    return await kadenafunctions.paginateAll(
      (params) => kadenafunctions.getTransactions(params), 
      { first: 2, accountName: testAccount, chainId: chainId },
      1 // Limit to 1 page for the test
    );
  });

  console.log('\nAll tests completed');
}

// Run the tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
}); 