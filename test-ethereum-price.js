const { fetchMarketData } = require('./services/dataServices');

async function testEthereumPrice() {
  const coinVariants = ['Ethereum', 'ETHEREUM', 'ethereum', 'ETH', 'eth'];
  
  console.log('Testing different Ethereum identifiers:');
  
  for (const coin of coinVariants) {
    try {
      console.log(`\nTrying with: "${coin}"`);
      const data = await fetchMarketData(coin);
      
      console.log(`Result name: ${data?.name || 'N/A'}`);
      console.log(`Result symbol: ${data?.symbol || 'N/A'}`);
      console.log(`Result price: $${data?.price?.toLocaleString() || 'N/A'}`);
      
      // Check if this looks like the real Ethereum
      if (data?.name?.toLowerCase().includes('ethereum') && 
          !data?.name?.toLowerCase().includes('classic') && 
          data?.price > 100) {
        console.log('✅ THIS APPEARS TO BE THE REAL ETHEREUM');
      } else {
        console.log('❌ Not the real Ethereum');
      }
    } catch (error) {
      console.error(`Error with "${coin}":`, error.message);
    }
  }
}

testEthereumPrice(); 