import {
  fetchWithTimeout,
  type MarketDataProvider,
  type MarketDataSymbolRow,
  type ProviderQuote,
} from './types';

const PROVIDER_KEY = 'goldapi';

interface GoldApiResponse {
  price?: number;
}

export const goldApiProvider: MarketDataProvider = {
  name: 'goldapi',
  async fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]> {
    const targets = symbols
      .map((symbol) => ({ symbol, code: symbol.provider_codes[PROVIDER_KEY] }))
      .filter((t): t is { symbol: MarketDataSymbolRow; code: string } => Boolean(t.code));
    if (targets.length === 0) return [];

    // Gold-API.com chi nhan 1 symbol/request — goi song song, 1 symbol loi
    // khong duoc lam hong cac symbol con lai (vd XAU song, XAG loi).
    const results = await Promise.allSettled(
      targets.map(({ code }) => fetchWithTimeout(`https://api.gold-api.com/price/${encodeURIComponent(code)}`))
    );

    const quotes: ProviderQuote[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { symbol } = targets[i];
      if (result.status !== 'fulfilled' || !result.value.ok) continue;

      const data = (await result.value.json()) as GoldApiResponse;
      if (data.price === undefined || !Number.isFinite(data.price)) continue;

      quotes.push({ symbolId: symbol.id, price: data.price, changePercent: null });
    }

    if (quotes.length === 0) {
      throw new Error('Gold-API request failed for all symbols');
    }

    return quotes;
  },
};
