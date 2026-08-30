import dns from 'node:dns';
import https from 'node:https';
import {
  type MarketDataProvider,
  type MarketDataSymbolRow,
  type ProviderQuote,
} from './types';

const PROVIDER_KEY = 'goldapi';

interface GoldApiResponse {
  price?: number;
}

// Trong Docker, `fetch` (undici) không cho set `servername` riêng nên khi GETADDRINFO
// gặp quirk IPv6/AF_UNSPEC (ENOTFOUND dù DNS solve được) ta phải tự resolve IPv4 rồi
// gọi qua https.request với `servername` để SNI + cert check đúng hostname.
// IP trả về từ DNS là round-robin nên resolve động mỗi lần (không cache cố định).
function goldApiFetch(path: string, timeoutMs = 15000): Promise<Response> {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    dns.promises
      .resolve4('api.gold-api.com')
      .then((ips) => {
        const ip = ips[0];
        const req = https.request(
          {
            host: ip,
            path,
            method: 'GET',
            headers: { Host: 'api.gold-api.com', 'User-Agent': 'pipsnote-market-data' },
            servername: 'api.gold-api.com',
            rejectUnauthorized: true,
            timeout: timeoutMs,
          },
          (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
              const resp = new Response(body, { status: res.statusCode ?? 502 });
              finish(() => resolvePromise(resp));
            });
          }
        );
        req.on('timeout', () => {
          req.destroy();
          finish(() => rejectPromise(new Error('Gold-API fetch timeout')));
        });
        req.on('error', (err) => finish(() => rejectPromise(err)));
        req.end();
      })
      .catch((err) => finish(() => rejectPromise(err)));
  });
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
      targets.map(({ code }) => goldApiFetch(`/price/${encodeURIComponent(code)}`))
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