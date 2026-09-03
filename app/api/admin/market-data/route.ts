import { NextRequest, NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/withApiHandler';
import { requireAdmin } from '@/lib/getAdminUser';
import { query } from '@/lib/db';
import type { MarketDataSymbol } from '@/lib/types';
import { z } from 'zod';

const CATEGORIES = ['forex', 'crypto', 'commodity', 'stock'] as const;

async function getHandler(_req: NextRequest) {
  await requireAdmin(['superadmin']);

  // LEFT JOIN — admin can thay ca symbol chua co snapshot lan nao de debug provider chet,
  // khac voi getMarketDataSnapshot() (public) dung JOIN thuong de an symbol chua co gia.
  const items = await query<MarketDataSymbol[]>(
    `SELECT s.id, s.label, s.category, s.decimals, s.is_active, s.sort_order, s.updated_at,
            sn.price, sn.change_percent, sn.direction, sn.source, sn.fetched_at
     FROM market_data_symbols s
     LEFT JOIN market_data_snapshots sn ON sn.symbol_id = s.id
     ORDER BY s.sort_order DESC, s.updated_at DESC, s.id DESC`
  );

  return NextResponse.json({ items });
}

const CreateSymbolSchema = z.object({
  label: z.string().min(1).max(20),
  category: z.enum(CATEGORIES),
  decimals: z.number().int().min(0).max(6).default(2),
  yahooCode: z.string().max(40).optional(), // tự luận nếu bỏ trống, chỉ set khi chuẩn khác mặc định
});

// Tự luận provider_codes cho symbol MỚI theo category. Yahoo (free fallback) luôn có code để
// symbol mới có giá ngay dù các nguồn khác cần key/slug chưa cấu hình. Mã ngoài chuẩn (VÍ DỤ:
// crypto slug coingecko, commodity code) bugi bỏ trống -> chuỗi fallback yahoo chạy.
function deriveProviderCodes(category: string, label: string, yahooCode?: string) {
  const base = label.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let yahoo: string;
  if (yahooCode) {
    yahoo = yahooCode.trim();
  } else if (category === 'forex') {
    yahoo = `${base}=X`; // EURUSD=X
  } else if (category === 'crypto') {
    yahoo = `${base.split('USD')[0]}USD-USD`.replace('USDUSD', 'USD'); // BTC/USD -> BTC-USD
  } else if (category === 'stock') {
    yahoo = base; // AAPL
  } else {
    yahoo = base; // commodity: yêu cầu admin nhập chính xác (GC=F, SI=F, CL=F...)
  }

  const codes: Record<string, string> = { yahoo };
  if (category === 'forex') {
    codes.fcs = base;
    codes.twelvedata = `${base.slice(0, 3)}/${base.slice(3)}`;
  } else if (category === 'stock') {
    codes.alpaca = base;
  } else if (category === 'crypto' && base) {
    // giữ coingecko trống để admin thêm slug nếu muốn siêu chính xác; yahoo đủ free
    codes.coingecko = '' as never; // chuỗi fallback yahoo đảm bảo có giá
  } else if (category === 'commodity' && base.length === 3) {
    codes.goldapi = base; // XAU, XAG
  }
  return codes;
}

async function postHandler(req: NextRequest) {
  await requireAdmin(['superadmin']);

  const body = CreateSymbolSchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: body.error.flatten().fieldErrors }, { status: 400 });
  }
  const { label, category, decimals, yahooCode } = body.data;

  const providerCodes = deriveProviderCodes(category, label, yahooCode);
  const codeJson = JSON.stringify(providerCodes);

  let sortOrder: number;
  const rows = await query<Array<{ m: number }>>(
    'SELECT COALESCE(MAX(sort_order), 0) AS m FROM market_data_symbols'
  );
  sortOrder = (rows[0]?.m ?? 0) + 10;

  await query(
    `INSERT INTO market_data_symbols (label, category, provider_codes, decimals, is_active, sort_order)
     VALUES (?, ?, ?, ?, TRUE, ?)
     ON DUPLICATE KEY UPDATE category = VALUES(category), provider_codes = VALUES(provider_codes), decimals = VALUES(decimals)`,
    [label, category, codeJson, decimals, sortOrder]
  );

  // Trigger refresh để symbol mới có giá ngay.
  const { refreshMarketData } = await import('@/lib/marketData/refresh');
  const result = await refreshMarketData();

  return NextResponse.json(
    {
      ok: true,
      symbol: { label, category, decimals, provider_codes: providerCodes },
      refresh: { succeeded: result?.succeeded?.length ?? 0, failed: result?.failed?.length ?? 0 },
    },
    { status: 201 }
  );
}

export const GET = withApiHandler('admin-market-data-list', getHandler);
export const POST = withApiHandler('admin-market-data-create', postHandler);
