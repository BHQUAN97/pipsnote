import { query, withTransaction } from '@/lib/db';
import type { RowDataPacket } from 'mysql2';
import { getProviderChain } from './providerRegistry';
import type { MarketDataSymbolRow, ProviderQuote, SymbolCategory } from './providers/types';
import { invalidateMarketDataSnapshotCache } from './getSnapshot';
import { getSiteSettings } from '@/lib/settings';

async function readRetentionDays(): Promise<number> {
  try {
    const s = await getSiteSettings();
    const v = parseInt(s['market.history_retention_days'] ?? '', 10);
    if (Number.isInteger(v) && v >= 1 && v <= 365) return v;
  } catch {
    // fall-through — mặc định nếu settings lỗi
  }
  return 30;
}

interface SymbolDbRow extends RowDataPacket {
  id: number;
  label: string;
  category: SymbolCategory;
  provider_codes: string | Record<string, string>;
  decimals: number;
}

interface ResolvedQuote extends ProviderQuote {
  source: string;
}

export interface RefreshResult {
  succeeded: string[];
  failed: string[];
}

export async function refreshMarketData(): Promise<RefreshResult> {
  const rows = await query<SymbolDbRow[]>(
    'SELECT id, label, category, provider_codes, decimals FROM market_data_symbols WHERE is_active = 1'
  );

  const symbols: MarketDataSymbolRow[] = rows.map((row) => ({
    id: row.id,
    label: row.label,
    category: row.category,
    decimals: row.decimals,
    provider_codes:
      typeof row.provider_codes === 'string' ? JSON.parse(row.provider_codes) : row.provider_codes,
  }));

  const byCategory = new Map<SymbolCategory, MarketDataSymbolRow[]>();
  for (const symbol of symbols) {
    const list = byCategory.get(symbol.category) ?? [];
    list.push(symbol);
    byCategory.set(symbol.category, list);
  }

  const resolvedQuotes: ResolvedQuote[] = [];
  const resolvedIds = new Set<number>();

  for (const [category, categorySymbols] of byCategory) {
    for (const provider of await getProviderChain(category)) {
      const remaining = categorySymbols.filter((s) => !resolvedIds.has(s.id));
      if (remaining.length === 0) break;

      try {
        const quotes = await provider.fetchQuotes(remaining);
        for (const quote of quotes) {
          if (resolvedIds.has(quote.symbolId)) continue;
          resolvedQuotes.push({ ...quote, source: provider.name });
          resolvedIds.add(quote.symbolId);
        }
      } catch {
        // Provider nay loi toan bo — thu provider ke tiep trong chain (neu con);
        // symbol chua resolve duoc thi giu nguyen gia cu trong DB (khong ghi de, khong NULL).
        continue;
      }
    }
  }

  if (resolvedQuotes.length > 0) {
    await withTransaction(async (conn) => {
      for (const quote of resolvedQuotes) {
        const [existingRows] = await conn.query(
          'SELECT price FROM market_data_snapshots WHERE symbol_id = ? LIMIT 1',
          [quote.symbolId]
        );
        const existing = (existingRows as RowDataPacket[])[0] as { price: string } | undefined;
        const prevPrice = existing ? Number(existing.price) : null;

        let direction: 'up' | 'down' | 'flat' = 'flat';
        if (prevPrice !== null) {
          if (quote.price > prevPrice) direction = 'up';
          else if (quote.price < prevPrice) direction = 'down';
        }

        await conn.query(
          `INSERT INTO market_data_snapshots (symbol_id, price, change_percent, direction, source, fetched_at)
           VALUES (?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE
             price = VALUES(price),
             change_percent = VALUES(change_percent),
             direction = VALUES(direction),
             source = VALUES(source),
             fetched_at = VALUES(fetched_at)`,
          [quote.symbolId, quote.price, quote.changePercent, direction, quote.source]
        );

        // Chuoi thoi gian de ve bieu do: luu moi lan refresh (khong upsert).
        await conn.query(
          `INSERT INTO market_data_price_history (symbol_id, price, change_percent, direction, source, fetched_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [quote.symbolId, quote.price, quote.changePercent, direction, quote.source]
        );
      }

      // Don du lieu cu theo retention (mac dinh 30 ngay, cau hinh qua admin).
      const retentionDays = await readRetentionDays();
      await conn.query('DELETE FROM market_data_price_history WHERE fetched_at < DATE_SUB(NOW(), INTERVAL ? DAY)', [retentionDays]);
    });

    await invalidateMarketDataSnapshotCache();
  }

  const labelById = new Map(symbols.map((s) => [s.id, s.label]));
  const succeeded = [...resolvedIds].map((id) => labelById.get(id)).filter((l): l is string => Boolean(l));
  const failed = symbols.filter((s) => !resolvedIds.has(s.id)).map((s) => s.label);

  return { succeeded, failed };
}
