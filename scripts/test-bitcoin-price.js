const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Find available port
async function findAvailablePort() {
  const ports = [3005, 3004, 3006, 3007, 3008];
  
  for (const port of ports) {
    try {
      console.log(`Checking if API is running on port ${port}...`);
      const response = await axios.get(`http://localhost:${port}/health`, { timeout: 1000 });
      if (response.status === 200) {
        console.log(`Found API server running on port ${port}`);
        return port;
      }
    } catch (error) {
      // Continue to next port
    }
  }
  
  console.log('No running API server found on common ports, defaulting to 3005');
  return 3005; // Default
}

// Test Bitcoin price query
async function testBitcoinPriceQuery() {
  console.log('Starting Bitcoin price query test');
  
  try {
    // Find the port where the API is running
    const port = await findAvailablePort();
    const apiUrl = `http://localhost:${port}/api/analyze`;
    
    console.log(`Using API URL: ${apiUrl}`);
    console.log('Sending request...');
    
    const startTime = Date.now();
    
    // Make the API request
    const response = await axios.post(apiUrl, {
      query: 'What is the current price of Bitcoin? Provide a detailed analysis of recent price movements.',
      systemPrompt: 'You are a helpful crypto assistant with expertise in Bitcoin price analysis.'
    }, {
      timeout: 30000 // 30 seconds timeout
    });
    
    const duration = Date.now() - startTime;
    
    // Check if the response is valid
    if (response.status === 200 && response.data && response.data.success === true) {
      console.log(`✅ Test passed! (${duration}ms)`);
      console.log('Response summary:');
      
      // Display a summary of the response
      if (response.data.data && response.data.data.analysis) {
        // If using the agent.js structure
        const analysis = response.data.data.analysis;
        console.log('Analysis:', typeof analysis === 'string' 
          ? analysis.substring(0, 200) + '...' 
          : JSON.stringify(analysis).substring(0, 200) + '...');
      } else if (response.data.analysis) {
        // If using the simplified structure
        const analysis = response.data.analysis;
        console.log('Analysis:', typeof analysis === 'string' 
          ? analysis.substring(0, 200) + '...' 
          : JSON.stringify(analysis).substring(0, 200) + '...');
      }
      
      return true;
    } else {
      console.log(`❌ Test failed! (${duration}ms)`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Test failed with exception!');
    console.error('Error:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    
    return false;
  }
}

// Run the test
console.log('=== Bitcoin Price Query Test ===');
testBitcoinPriceQuery().then(success => {
  if (success) {
    console.log('Test completed successfully!');
    process.exit(0);
  } else {
    console.log('Test failed!');
    process.exit(1);
  }
}).catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});