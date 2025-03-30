const { 
  fetchPriceHistory, 
  fetchMarketData, 
  fetchMetadata,
  fetchSocialData,
  fetchCoinList,
  fetchTopicNews
} = require('./dataServices');

const { getTokenName } = require('../utils/calculationUtils');

// Constants
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

// Price History Functions
const priceHistoryData = async (token, period) => {
  const normalizedToken = getTokenName(token);
  const now = Date.now();
  const from = now - TIME_PERIODS[period];
  return await fetchPriceHistory(normalizedToken, from, now);
};

// Token Status Functions
const isListed = async (token) => {
  const normalizedToken = getTokenName(token);
  const data = await fetchMarketData(normalizedToken);
  return data ? 'Listed' : 'Not Listed';
};

// Wrapper for fetchPriceHistory
const getPriceHistory = async (token, period) => {
  const normalizedToken = getTokenName(token);
  const now = Date.now();
  const from = now - TIME_PERIODS[period];
  return await fetchPriceHistory(normalizedToken, from, now);
};

// Social Data Function
const getSocialData = async (token) => {
  const normalizedToken = getTokenName(token);
  const socialData = await fetchSocialData(normalizedToken);
  
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
};

// Coin List Category Function
const getListByCategory = async (sort = 'social_dominance', filter = '', limit = 20) => {
  const data = await fetchCoinList(sort, filter, limit);
  
  if (!data) {
    throw new Error('No data received from LunarCrush API');
  }

  // Transform the data to a more usable format
  return data.map(coin => ({
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
};

// Topic News Function
const getTopicNews = async (topic) => {
  const data = await fetchTopicNews(topic);
  
  if (!data) {
    return 'No news data available';
  }

  return data.map(item => ({
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
};

module.exports = {
  // Token Information Functions
  website,
  twitter,
  telegram,
  discord,
  description,
  
  // Market Data Functions
  price,
  volume,
  marketCap,
  marketCapDiluted,
  
  // Token Metrics Functions
  liquidity,
  liquidityChange24h,
  offChainVolume,
  volume7d,
  
  // Price Change Functions
  volumeChange24h,
  priceChange24h,
  priceChange1h,
  priceChange7d,
  priceChange1m,
  priceChange30d,
  priceChange1y,
  
  // Token Stats Functions
  ath,
  atl,
  rank,
  totalSupply,
  circulatingSupply,
  
  // Advanced Token Analysis Functions
  cexs,
  investors,
  distribution,
  releaseSchedule,
  
  // Price History Functions
  priceHistoryData,
  getPriceHistory,
  
  // Token Status Functions
  isListed,
  
  // Social Data Function
  getSocialData,
  
  // Category and News Functions
  getListByCategory,
  getTopicNews,
  
  // Constants
  TIME_PERIODS
}; 