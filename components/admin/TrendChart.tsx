interface TrendChartProps {
  data: Array<{ day: string; total: number }>;
  height?: number;
}

export default function TrendChart({ data, height = 160 }: TrendChartProps) {
  const width = 600;
  const padding = 8;

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-gray-mid" style={{ height }}>
        No click data in the last 30 days.
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.total));
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = padding + i * stepX;
    const y = height - padding - (d.total / max) * (height - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${height - padding} L${points[0].x},${height - padding} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      role="img"
      aria-label="Affiliate click trend, last 30 days"
    >
      <path d={areaPath} fill="var(--red)" fillOpacity={0.12} />
      <path d={linePath} fill="none" stroke="var(--red)" strokeWidth={2} />
      {points.map((p) => (
        <circle key={p.day} cx={p.x} cy={p.y} r={2.5} fill="var(--red)" />
      ))}
    </svg>
  );
}
