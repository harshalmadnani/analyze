const { fetchMarketData } = require('./services/dataServices');

async function testBitcoinPrice() {
  const coinVariants = ['Bitcoin', 'BITCOIN', 'bitcoin', 'BTC', 'btc'];
  
  console.log('Testing different Bitcoin identifiers:');
  
  for (const coin of coinVariants) {
    try {
      console.log(`\nTrying with: "${coin}"`);
      const data = await fetchMarketData(coin);
      
      console.log(`Result name: ${data?.name || 'N/A'}`);
      console.log(`Result symbol: ${data?.symbol || 'N/A'}`);
      console.log(`Result price: $${data?.price?.toLocaleString() || 'N/A'}`);
      
      // Check if this looks like the real Bitcoin
      if (data?.name?.toLowerCase().includes('bitcoin') && 
          !data?.name?.toLowerCase().includes('cash') && 
          data?.price > 10000) {
        console.log('✅ THIS APPEARS TO BE THE REAL BITCOIN');
      } else {
        console.log('❌ Not the real Bitcoin');
      }
    } catch (error) {
      console.error(`Error with "${coin}":`, error.message);
    }
  }
}

testBitcoinPrice(); 