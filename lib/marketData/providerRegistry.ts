import type { MarketDataProvider, SymbolCategory } from './providers/types';
import { mockProvider } from './providers/mock';
import { twelveDataProvider } from './providers/twelveData';
import { fcsProvider } from './providers/fcs';
import { coinGeckoProvider } from './providers/coinGecko';
import { goldApiProvider } from './providers/goldApi';
import { alpacaProvider } from './providers/alpaca';

// forex: twelvedata la primary, fcs la fallback khi twelvedata throw toan bo request
const CATEGORY_CHAINS: Record<SymbolCategory, MarketDataProvider[]> = {
  forex: [twelveDataProvider, fcsProvider],
  commodity: [goldApiProvider],
  crypto: [coinGeckoProvider],
  stock: [alpacaProvider],
};

export function getProviderChain(category: SymbolCategory): MarketDataProvider[] {
  if (process.env.MARKET_DATA_MOCK === 'true') {
    return [mockProvider];
  }
  return CATEGORY_CHAINS[category];
}
