import {
  fetchWithTimeout,
  type MarketDataProvider,
  type MarketDataSymbolRow,
  type ProviderQuote,
} from './types';

const PROVIDER_KEY = 'yahoo';

interface YahooMeta {
  symbol?: string;
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  previousClose?: number;
}

interface YahooChartResponse {
  chart?: { result?: Array<{ meta?: YahooMeta }> | null };
}

// Yahoo Finance — nguồn MIỄN PHÍ, KHÔNG cần API key. Phủ toàn bộ
// forex (EURUSD=X), vàng/bạc (GC=F, SI=F), cổ phiếu (AAPL), crypto (BTC-USD).
// Dùng undici fetch thuần — Yahoo resolve DNS bình thường trong Docker (không
// bị quirk như gold-api), nên không cần https/servername workaround.
export const yahooProvider: MarketDataProvider = {
  name: 'yahoo',
  async fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]> {
    const targets = symbols
      .map((symbol) => ({ symbol, code: symbol.provider_codes[PROVIDER_KEY] }))
      .filter((t): t is { symbol: MarketDataSymbolRow; code: string } => Boolean(t.code));
    if (targets.length === 0) return [];

    // Yahoo nhan nhieu symbol dang batch qua endpoint chart? Khong — 1 symbol/request,
    // goi song song. 1 symbol loi khong lam hong cac symbol con lai.
    const results = await Promise.allSettled(
      targets.map(({ code }) =>
        fetchWithTimeout(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(code)}?interval=1d&range=1d`,
          { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) pipsnote' } },
          15000
        )
      )
    );

    const quotes: ProviderQuote[] = [];
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const { symbol } = targets[i];
      if (result.status !== 'fulfilled' || !result.value.ok) continue;

      let data: YahooChartResponse;
      try {
        data = (await result.value.json()) as YahooChartResponse;
      } catch {
        continue;
      }

      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice;
      if (typeof price !== 'number' || !Number.isFinite(price)) continue;

      const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;
      const changePercent =
        typeof prevClose === 'number' && Number.isFinite(prevClose) && prevClose !== 0
          ? ((price - prevClose) / prevClose) * 100
          : null;

      quotes.push({ symbolId: symbol.id, price, changePercent });
    }

    if (quotes.length === 0) {
      throw new Error('Yahoo Finance returned no quotes for any symbol');
    }

    return quotes;
  },
};