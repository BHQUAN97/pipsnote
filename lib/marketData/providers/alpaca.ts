import {
  fetchWithTimeout,
  type MarketDataProvider,
  type MarketDataSymbolRow,
  type ProviderQuote,
} from './types';

const PROVIDER_KEY = 'alpaca';

interface AlpacaSnapshot {
  latestTrade?: { p?: number };
  prevDailyBar?: { c?: number };
}

export const alpacaProvider: MarketDataProvider = {
  name: 'alpaca',
  async fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]> {
    const apiKey = process.env.ALPACA_API_KEY;
    const apiSecret = process.env.ALPACA_API_SECRET;
    if (!apiKey || !apiSecret) {
      throw new Error('ALPACA_API_KEY/ALPACA_API_SECRET is not configured');
    }

    const bySymbol = new Map<string, MarketDataSymbolRow>();
    for (const symbol of symbols) {
      const code = symbol.provider_codes[PROVIDER_KEY];
      if (code) bySymbol.set(code, symbol);
    }
    if (bySymbol.size === 0) return [];

    const codes = [...bySymbol.keys()].join(',');
    const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(codes)}`;

    const res = await fetchWithTimeout(url, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });
    if (!res.ok) {
      throw new Error(`Alpaca request failed with status ${res.status}`);
    }

    const data = (await res.json()) as Record<string, AlpacaSnapshot>;

    const quotes: ProviderQuote[] = [];
    for (const [code, snapshot] of Object.entries(data)) {
      const symbol = bySymbol.get(code);
      const price = snapshot?.latestTrade?.p;
      if (!symbol || price === undefined || !Number.isFinite(price)) continue;

      const prevClose = snapshot?.prevDailyBar?.c;
      const changePercent =
        prevClose !== undefined && Number.isFinite(prevClose) && prevClose !== 0
          ? ((price - prevClose) / prevClose) * 100
          : null;

      quotes.push({ symbolId: symbol.id, price, changePercent });
    }

    return quotes;
  },
};
