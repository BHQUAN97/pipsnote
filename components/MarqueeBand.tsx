'use client';

import { useEffect, useId } from 'react';

/**
 * Infinite editorial marquee band. Content duplicated ×2 for the -50% loop.
 * Pure CSS animation; JS only passes items to render (they're plain markup).
 */
export default function MarqueeBand({
  items = ['Forex', 'CFD', 'Indices', 'Commodities', 'Crypto', 'Analysis'],
  className = 'border-y border-gray-line bg-surface-dark py-4',
}: {
  items?: string[];
  className?: string;
}) {
  const cid = useId();
  const row = (key: string) => (
    <div className="flex items-center gap-8 whitespace-nowrap px-4" key={key}>
      {items.map((word) => (
        <span key={word} className="flex items-center gap-8">
          <span className="text-h2 font-display uppercase tracking-tight text-white">{word}</span>
          <span className="h-2.5 w-2.5 rotate-45 rounded-[2px] bg-brand" />
        </span>
      ))}
    </div>
  );

  return (
    <div className={`marquee-wrap ${className}`} aria-hidden="true">
      <div className="marquee-track">
        {row(`${cid}-a`)}
        {row(`${cid}-b`)}
      </div>
    </div>
  );
}