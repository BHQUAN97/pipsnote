import {
  fetchWithTimeout,
  type MarketDataProvider,
  type MarketDataSymbolRow,
  type ProviderQuote,
} from './types';

const PROVIDER_KEY = 'twelvedata';

interface TwelveDataQuote {
  close?: string;
  percent_change?: string;
  code?: number; // co mat khi entry la loi
}

export const twelveDataProvider: MarketDataProvider = {
  name: 'twelvedata',
  async fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]> {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    if (!apiKey) {
      throw new Error('TWELVEDATA_API_KEY is not configured');
    }

    const bySymbol = new Map<string, MarketDataSymbolRow>();
    for (const symbol of symbols) {
      const code = symbol.provider_codes[PROVIDER_KEY];
      if (code) bySymbol.set(code, symbol);
    }
    if (bySymbol.size === 0) return [];

    const codes = [...bySymbol.keys()].join(',');
    const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(codes)}&apikey=${apiKey}`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`TwelveData request failed with status ${res.status}`);
    }

    const data = (await res.json()) as Record<string, TwelveDataQuote> | TwelveDataQuote;
    const entries: [string, TwelveDataQuote][] =
      bySymbol.size === 1
        ? [[codes, data as TwelveDataQuote]]
        : Object.entries(data as Record<string, TwelveDataQuote>);

    const quotes: ProviderQuote[] = [];
    for (const [code, quote] of entries) {
      const symbol = bySymbol.get(code);
      if (!symbol || !quote || quote.code !== undefined || quote.close === undefined) continue;

      const price = Number(quote.close);
      if (!Number.isFinite(price)) continue;

      const changePercent =
        quote.percent_change !== undefined ? Number(quote.percent_change) : null;

      quotes.push({
        symbolId: symbol.id,
        price,
        changePercent: changePercent !== null && Number.isFinite(changePercent) ? changePercent : null,
      });
    }

    return quotes;
  },
};
