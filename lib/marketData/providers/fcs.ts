import {
  fetchWithTimeout,
  type MarketDataProvider,
  type MarketDataSymbolRow,
  type ProviderQuote,
} from './types';

const PROVIDER_KEY = 'fcs';

interface FcsQuoteItem {
  s?: string;
  c?: string;
  cp?: string;
}

interface FcsResponse {
  status: boolean;
  response?: FcsQuoteItem[];
  msg?: string;
}

function normalizeCode(code: string): string {
  return code.replace('/', '').toUpperCase();
}

export const fcsProvider: MarketDataProvider = {
  name: 'fcs',
  async fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]> {
    const apiKey = process.env.FCSAPI_API_KEY;
    if (!apiKey) {
      throw new Error('FCSAPI_API_KEY is not configured');
    }

    const codes: string[] = [];
    const bySymbol = new Map<string, MarketDataSymbolRow>();
    for (const symbol of symbols) {
      const code = symbol.provider_codes[PROVIDER_KEY];
      if (!code) continue;
      codes.push(code);
      bySymbol.set(normalizeCode(code), symbol);
    }
    if (codes.length === 0) return [];

    const url = `https://fcsapi.com/api-v3/forex/latest?symbol=${encodeURIComponent(codes.join(','))}&access_key=${apiKey}`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      throw new Error(`FCS API request failed with status ${res.status}`);
    }

    const data = (await res.json()) as FcsResponse;
    if (!data.status || !Array.isArray(data.response)) {
      throw new Error(data.msg || 'FCS API returned an error response');
    }

    const quotes: ProviderQuote[] = [];
    for (const item of data.response) {
      if (!item.s || item.c === undefined) continue;
      const symbol = bySymbol.get(normalizeCode(item.s));
      if (!symbol) continue;

      const price = Number(item.c);
      if (!Number.isFinite(price)) continue;

      const changePercent = item.cp !== undefined ? Number(item.cp) : null;
      quotes.push({
        symbolId: symbol.id,
        price,
        changePercent: changePercent !== null && Number.isFinite(changePercent) ? changePercent : null,
      });
    }

    return quotes;
  },
};
