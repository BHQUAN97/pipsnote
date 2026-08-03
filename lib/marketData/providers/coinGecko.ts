import {
  fetchWithTimeout,
  type MarketDataProvider,
  type MarketDataSymbolRow,
  type ProviderQuote,
} from './types';

const PROVIDER_KEY = 'coingecko';

interface CoinGeckoEntry {
  usd?: number;
  usd_24h_change?: number;
}

export const coinGeckoProvider: MarketDataProvider = {
  name: 'coingecko',
  async fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]> {
    const bySymbol = new Map<string, MarketDataSymbolRow>();
    for (const symbol of symbols) {
      const code = symbol.provider_codes[PROVIDER_KEY];
      if (code) bySymbol.set(code, symbol);
    }
    if (bySymbol.size === 0) return [];

    const ids = [...bySymbol.keys()].join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids)}&vs_currencies=usd&include_24hr_change=true`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`CoinGecko request failed with status ${res.status}`);
    }

    const data = (await res.json()) as Record<string, CoinGeckoEntry>;

    const quotes: ProviderQuote[] = [];
    for (const [id, entry] of Object.entries(data)) {
      const symbol = bySymbol.get(id);
      if (!symbol || entry.usd === undefined || !Number.isFinite(entry.usd)) continue;

      quotes.push({
        symbolId: symbol.id,
        price: entry.usd,
        changePercent:
          entry.usd_24h_change !== undefined && Number.isFinite(entry.usd_24h_change)
            ? entry.usd_24h_change
            : null,
      });
    }

    return quotes;
  },
};
