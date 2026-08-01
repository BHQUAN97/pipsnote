'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';

interface LogRow {
  id: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  module: string | null;
  request_id: string | null;
  url: string | null;
  method: string | null;
  status_code: number | null;
  created_at: string;
}

const LEVELS = ['', 'debug', 'info', 'warn', 'error', 'fatal'];

const LEVEL_COLOR: Record<string, string> = {
  debug: 'bg-gray-bg',
  info: 'bg-gray-bg',
  warn: 'bg-brand text-white',
  error: 'bg-down text-white',
  fatal: 'bg-down text-white',
};

export default function AdminLogsPage() {
  const [items, setItems] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const pageSize = 50;

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (level) params.set('level', level);
    if (moduleName) params.set('module', moduleName);
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    fetch(`/api/admin/logs?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, level, moduleName, q, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleExpand(id: number) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    const res = await fetch(`/api/admin/logs/${id}`);
    if (res.ok) setDetail(await res.json());
  }

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">System Logs</h1>

      <form onSubmit={applyFilters} className="mb-6 flex flex-wrap gap-3">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="min-h-[44px] px-3 py-2 border border-gray-line rounded-sm text-sm"
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l || 'All levels'}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Module"
          value={moduleName}
          onChange={(e) => setModuleName(e.target.value)}
          className="min-h-[44px] px-3 py-2 border border-gray-line rounded-sm text-sm"
        />

        <input
          type="text"
          placeholder="Search message..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-[44px] px-3 py-2 border border-gray-line rounded-sm text-sm flex-1 min-w-[160px]"
        />

        <input
          type="datetime-local"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="min-h-[44px] px-3 py-2 border border-gray-line rounded-sm text-sm"
        />

        <input
          type="datetime-local"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="min-h-[44px] px-3 py-2 border border-gray-line rounded-sm text-sm"
        />

        <button
          type="submit"
          className="min-h-[44px] px-5 py-2 bg-brand text-white rounded-sm text-sm font-semibold hover:bg-brand-dark"
        >
          Filter
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">No logs found.</p>
      ) : (
        <div className="overflow-x-auto border border-gray-line">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gray-line bg-gray-bg text-left">
                <th className="p-3">Level</th>
                <th className="p-3">Message</th>
                <th className="p-3">Module</th>
                <th className="p-3">Status</th>
                <th className="p-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {items.map((log) => (
                <Fragment key={log.id}>
                  <tr
                    key={log.id}
                    onClick={() => toggleExpand(log.id)}
                    className="border-b border-gray-line last:border-0 cursor-pointer hover:bg-gray-bg"
                  >
                    <td className="p-3">
                      <span className={`rounded-sm px-2 py-1 font-mono text-xs ${LEVEL_COLOR[log.level]}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="p-3 max-w-[360px] truncate">{log.message}</td>
                    <td className="p-3 text-gray-mid">{log.module ?? '—'}</td>
                    <td className="p-3 text-gray-mid">{log.status_code ?? '—'}</td>
                    <td className="p-3 text-gray-mid whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString('en-US')}
                    </td>
                  </tr>
                  {expandedId === log.id && (
                    <tr className="border-b border-gray-line bg-gray-bg/40">
                      <td colSpan={5} className="p-4">
                        {detail ? (
                          <pre className="whitespace-pre-wrap break-all text-xs font-mono">
                            {JSON.stringify(detail, null, 2)}
                          </pre>
                        ) : (
                          <p className="text-xs text-gray-mid">Loading details...</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`flex h-11 min-w-11 items-center justify-center border px-3 text-sm ${
                p === page ? 'border-surface-dark bg-surface-dark text-white' : 'border-gray-line'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
