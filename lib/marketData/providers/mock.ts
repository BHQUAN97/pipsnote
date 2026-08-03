import type { MarketDataProvider, MarketDataSymbolRow, ProviderQuote } from './types';

// Gia tham chieu chi dung khi MARKET_DATA_MOCK=true — khong goi mang, cho phep test
// toan bo pipeline (cron → refresh → cache → ticker) ma khong ton quota API that.
const BASE_PRICES: Record<string, number> = {
  'EUR/USD': 1.0842,
  'GBP/USD': 1.2671,
  'USD/JPY': 155.32,
  'USD/CHF': 0.9012,
  'AUD/USD': 0.6614,
  'USD/CAD': 1.372,
  'NZD/USD': 0.6023,
  'XAU/USD': 2438.1,
  'XAG/USD': 29.14,
  'BTC/USD': 64215,
  'ETH/USD': 3120.5,
  AAPL: 189.5,
  TSLA: 246.3,
  MSFT: 415.2,
};

export const mockProvider: MarketDataProvider = {
  name: 'mock',
  async fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]> {
    return symbols.map((symbol) => {
      const base = BASE_PRICES[symbol.label] ?? 100;
      const jitterPercent = (Math.random() - 0.5) * 0.6; // +-0.3%
      const price = base * (1 + jitterPercent / 100);
      return { symbolId: symbol.id, price, changePercent: jitterPercent };
    });
  },
};
