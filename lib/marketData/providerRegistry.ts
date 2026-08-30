import type { MarketDataProvider, SymbolCategory } from './providers/types';
import { mockProvider } from './providers/mock';
import { twelveDataProvider } from './providers/twelveData';
import { fcsProvider } from './providers/fcs';
import { coinGeckoProvider } from './providers/coinGecko';
import { goldApiProvider } from './providers/goldApi';
import { alpacaProvider } from './providers/alpaca';
import { yahooProvider } from './providers/yahooFinance';
import { getProviderConfigRows } from './providerConfig';

// yahoo (free, khong can key) la fallback cuoi cung cho MOI nhom,
// dam bao luon co nguon real khi cac nguon tra phi/khong key bi loi.
const CATEGORY_CHAINS: Record<SymbolCategory, MarketDataProvider[]> = {
  forex: [twelveDataProvider, fcsProvider, yahooProvider],
  commodity: [goldApiProvider, yahooProvider],
  crypto: [coinGeckoProvider, yahooProvider],
  stock: [alpacaProvider, yahooProvider],
};

export async function getProviderChain(category: SymbolCategory): Promise<MarketDataProvider[]> {
  if (process.env.MARKET_DATA_MOCK === 'true') {
    return [mockProvider];
  }
  const config = await getProviderConfigRows();
  return CATEGORY_CHAINS[category].filter((p) => config[p.name]?.is_enabled ?? true);
}
