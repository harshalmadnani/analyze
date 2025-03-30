# Xade API

A modular NodeJS API for cryptocurrency data analysis and AI-powered insights.

## Project Structure

The project is organized into a modular structure:

```
xade-api/
├── agent.js                 # Main entry point
├── coins.json               # List of supported cryptocurrencies
├── services/
│   ├── aiServices.js        # AI integration services
│   ├── dataServices.js      # Data fetching services
│   ├── kadenaServices.js    # Kadena blockchain services
│   └── tokenServices.js     # Token-related services
└── utils/
    └── calculationUtils.js  # Calculation utility functions
```

## Features

- Cryptocurrency market data retrieval
- Token information and metrics
- Historical price data
- Social media analysis
- AI-powered market insights
- Kadena blockchain integration

## Environment Variables

Set the following environment variables:

```
REACT_APP_OPENAI_API_KEY=your_openai_api_key
REACT_APP_LUNARCRUSH_API_KEY=your_lunarcrush_api_key
MOBULA_API_KEY=your_mobula_api_key
CRYPTOPANIC_API_KEY=your_cryptopanic_api_key
KADENA_GRAPHQL_ENDPOINT=your_kadena_graphql_endpoint
KADENA_GRAPHQL_KEY=your_kadena_graphql_key
```

## Installation

```bash
npm install
```

## Usage

### Basic Usage

```javascript
const { analyzeQuery } = require('./agent');

const systemPrompt = "You are a helpful cryptocurrency assistant.";
const userQuestion = "What's the current state of Bitcoin?";

analyzeQuery(userQuestion, systemPrompt)
  .then(result => {
    console.log(result.data.analysis);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Available Services

The API is organized into modular services:

1. **Data Services** (`dataServices.js`)
   - Fetch price history, market data, metadata, wallet data

2. **Token Services** (`tokenServices.js`)
   - Token information, market data, price changes, token stats

3. **Kadena Services** (`kadenaServices.js`)
   - Interact with Kadena blockchain via GraphQL

4. **AI Services** (`aiServices.js`)
   - Generate data fetching code, analyze data, provide insights

5. **Utility Functions** (`calculationUtils.js`)
   - Calculate SMA, RSI, MACD and other technical indicators

## License

MIT 