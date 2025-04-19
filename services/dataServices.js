const axios = require('axios');
const { getTokenName } = require('../utils/calculationUtils');

// API Keys with fallbacks for different naming conventions
const MOBULA_API_KEY = process.env.MOBULA_API_KEY || process.env.REACT_APP_MOBULA_API_KEY || 'e26c7e73-d918-44d9-9de3-7cbe55b63b99';
const CRYPTOPANIC_API_KEY = process.env.CRYPTOPANIC_API_KEY || process.env.REACT_APP_CRYPTOPANIC_API_KEY || '2c962173d9c232ada498efac64234bfb8943ba70';
const LUNARCRUSH_API_KEY = process.env.LUNARCRUSH_API_KEY || process.env.REACT_APP_LUNARCRUSH_API_KEY;

// API Functions
const fetchPriceHistory = async (coinname, from = null, to = null) => {
  const normalizedCoin = getTokenName(coinname);
  const response = await axios.get(`https://api.mobula.io/api/1/market/history`, {
    params: {
      asset: normalizedCoin,
      from: from,
      to: to,
    },
    headers: {
      Authorization: MOBULA_API_KEY
    }
  });
  return response.data?.data?.price_history;
};

const fetchCryptoPanicData = async (coinname) => {
  const normalizedCoin = getTokenName(coinname);
  const response = await axios.get(`https://cryptopanic.com/api/free/v1/posts/`, {
    params: {
      auth_token: CRYPTOPANIC_API_KEY,
      public: 'true',
      currencies: normalizedCoin
    }
  });
  return response.data?.results;
};

const fetchMarketData = async (coinname) => {
  const normalizedCoin = getTokenName(coinname);
  const response = await axios.get(`https://api.mobula.io/api/1/market/data?asset=${normalizedCoin}`, {
    headers: {
      Authorization: MOBULA_API_KEY
    }
  });
  return response.data?.data;
};

const fetchMetadata = async (coinname) => {
  const normalizedCoin = getTokenName(coinname);
  const response = await axios.get(`https://api.mobula.io/api/1/metadata?asset=${normalizedCoin}`, {
    headers: {
      Authorization: MOBULA_API_KEY
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
      Authorization: MOBULA_API_KEY
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
      Authorization: MOBULA_API_KEY
    }
  });
  return response.data?.data[0];
};

// Fetch social data from LunarCrush
const fetchSocialData = async (token) => {
  try {
    const normalizedToken = getTokenName(token);
    const response = await axios.get(`https://lunarcrush.com/api4/public/topic/${normalizedToken}/v1`, {
      headers: {
        'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
      }
    });
    return response.data?.data;
  } catch (error) {
    console.error('Error fetching social data:', error);
    return null;
  }
};

// Fetch coin list from LunarCrush
const fetchCoinList = async (sort = 'social_dominance', filter = '', limit = 20) => {
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
    return response.data?.data;
  } catch (error) {
    console.error('Error fetching coin list:', error);
    return null;
  }
};

// Fetch topic news from LunarCrush
const fetchTopicNews = async (topic) => {
  try {
    const normalizedTopic = getTokenName(topic);
    const response = await axios.get(`https://lunarcrush.com/api4/public/topic/${normalizedTopic}/news/v1`, {
      headers: {
        'Authorization': `Bearer ${LUNARCRUSH_API_KEY}`
      }
    });
    return response.data?.data;
  } catch (error) {
    console.error('Error fetching topic news:', error);
    return null;
  }
};

module.exports = {
  fetchPriceHistory,
  fetchCryptoPanicData,
  fetchMarketData,
  fetchMetadata,
  fetchHistoricPortfolioData,
  fetchWalletPortfolio,
  fetchSocialData,
  fetchCoinList,
  fetchTopicNews
}; 