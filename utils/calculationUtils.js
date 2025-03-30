const coins = require('../coins.json');

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

module.exports = {
  getTokenName,
  calculateSMA,
  calculateRSI,
  calculateMACD,
  calculateEMA,
  determineTrend,
  calculateVolatility,
  calculateTrend
}; 