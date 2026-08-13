import type { MarketDataProvider, SymbolCategory } from './providers/types';
import { mockProvider } from './providers/mock';
import { twelveDataProvider } from './providers/twelveData';
import { fcsProvider } from './providers/fcs';
import { coinGeckoProvider } from './providers/coinGecko';
import { goldApiProvider } from './providers/goldApi';
import { alpacaProvider } from './providers/alpaca';
import { getProviderConfigRows } from './providerConfig';

// forex: twelvedata la primary, fcs la fallback khi twelvedata throw toan bo request
const CATEGORY_CHAINS: Record<SymbolCategory, MarketDataProvider[]> = {
  forex: [twelveDataProvider, fcsProvider],
  commodity: [goldApiProvider],
  crypto: [coinGeckoProvider],
  stock: [alpacaProvider],
};

export async function getProviderChain(category: SymbolCategory): Promise<MarketDataProvider[]> {
  if (process.env.MARKET_DATA_MOCK === 'true') {
    return [mockProvider];
  }
  const config = await getProviderConfigRows();
  return CATEGORY_CHAINS[category].filter((p) => config[p.name]?.is_enabled ?? true);
}
