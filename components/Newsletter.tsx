'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function Newsletter() {
  const t = useTranslations('newsletter');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' }),
      });
      if (!res.ok) throw new Error('failed');
      setStatus('success');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  return (
    <div className="flex flex-col items-start gap-10 bg-surface-dark p-8 text-white md:flex-row md:items-center md:justify-between md:p-14">
      <div>
        <h2 className="mb-2 max-w-[380px] text-2xl text-white">
          {t('heading')}
        </h2>
        <p className="text-sm text-white/60">{t('subtext')}</p>
      </div>

      <div className="w-full md:min-w-[360px] md:max-w-[360px]">
        <form onSubmit={handleSubmit} className="flex w-full gap-0">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
            placeholder={t('emailPlaceholder')}
            className="min-w-0 flex-1 border border-white/20 bg-transparent px-4 py-4 text-sm text-white placeholder:text-white/40 transition-colors focus:border-brand focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={status === 'loading'}
            className="shrink-0 bg-brand px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {status === 'loading' ? '...' : t('subscribe')}
          </button>
        </form>
        {status === 'success' && (
          <p className="mt-2 text-xs text-up">{t('success')}</p>
        )}
        {status === 'error' && (
          <p className="mt-2 text-xs text-down">{t('error')}</p>
        )}
      </div>
    </div>
  );
}
