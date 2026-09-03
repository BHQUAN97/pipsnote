'use client';

import { useEffect, useState } from 'react';

interface PricePoint {
  price: number;
  t: string;
}

interface MarketChartProps {
  symbolId: number;
  label: string;
  decimals: number;
}

const W = 640;
const H = 180;

function formatPrice(v: number, d: number): string {
  return v.toFixed(d);
}

function fmtTime(iso: string, prevIso?: string): string {
  const t = new Date(iso);
  const sameDay = prevIso && new Date(prevIso).toDateString() === t.toDateString();
  if (sameDay) return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return t.toLocaleDateString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function MarketChart({ symbolId, label, decimals }: MarketChartProps) {
  const [points, setPoints] = useState<PricePoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/market-data/${symbolId}/history?limit=200`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => !cancelled && setPoints(d.points))
      .catch(() => !cancelled && setError('Không tải được lịch sử giá.'));
    return () => {
      cancelled = true;
    };
  }, [symbolId]);

  if (error) return <p className="text-sm text-down">{error}</p>;
  if (!points || points.length === 0)
    return (
      <p className="text-sm text-gray-mid">
        Chưa có dữ liệu lịch sử. Đồng bộ vài lần (mặc định 15 phút/lần) sẽ có biểu đồ.
      </p>
    );

  const prices = points.map((p) => p.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const pad = 8;

  const px = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const py = (v: number) => pad + (1 - (v - min) / range) * (H - pad * 2);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(p.price).toFixed(1)}`).join(' ');
  const last = points[points.length - 1];
  const first = points[0];
  const change = ((last.price - first.price) / first.price) * 100;
  const up = change >= 0;
  const lastT = last.t;
  const prevT = points[points.length - 2]?.t;

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-lg font-semibold">{formatPrice(last.price, decimals)}</span>
        <span className={`font-mono ${up ? 'text-up' : 'text-down'}`}>
          {change >= 0 ? '+' : ''}
          {change.toFixed(2)}%
        </span>
        <span className="text-xs text-gray-mid">
          {min.toFixed(decimals)} – {max.toFixed(decimals)} · cập nhật {fmtTime(lastT, prevT)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-40 w-full"
        role="img"
        aria-label={`Biểu đồ biến động giá ${label}`}
      >
        {/* grid-lines ngang */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad}
            x2={W - pad}
            y1={py(min + range * f)}
            y2={py(min + range * f)}
            stroke="currentColor"
            strokeOpacity="0.12"
            strokeDasharray="4 4"
          />
        ))}
        <path d={line} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={px(points.length - 1)} cy={py(last.price)} r="3.5" fill="var(--red)" />
      </svg>
    </div>
  );
}