export type SymbolCategory = 'forex' | 'crypto' | 'commodity' | 'stock';

export interface MarketDataSymbolRow {
  id: number;
  label: string;
  category: SymbolCategory;
  provider_codes: Record<string, string>;
  decimals: number;
}

export interface ProviderQuote {
  symbolId: number;
  price: number;
  changePercent: number | null;
}

export interface MarketDataProvider {
  name: string;
  fetchQuotes(symbols: MarketDataSymbolRow[]): Promise<ProviderQuote[]>;
}

const DEFAULT_TIMEOUT_MS = 8000;

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
