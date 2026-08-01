'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import TrendChart from '@/components/admin/TrendChart';

interface DashboardData {
  postsByStatus: { draft: number; published: number; archived: number };
  activeBrokerCount: number;
  topPosts: Array<{ id: number; title: string; view_count: number }>;
  topBrokers: Array<{ id: number; name: string; click_count: number }>;
  clickTrend: Array<{ day: string; total: number }>;
  recentErrorCount: number;
}

function StatCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="card-elevated rounded-sm border border-gray-line bg-gray-bg p-5">
      <div className="mb-1 font-mono text-label uppercase tracking-[0.06em] text-gray-mid">{label}</div>
      <div className={`font-mono text-2xl font-semibold ${alert && value > 0 ? 'text-down' : ''}`}>{value}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(() => {
    fetch('/api/admin/dashboard')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((d: DashboardData) => {
        setData(d);
        setLastUpdated(new Date());
      })
      .catch(() => setData((prev) => prev ?? null))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-gray-mid">Loading...</p>;
  }

  if (!data) {
    return <p className="text-sm text-gray-mid">Failed to load dashboard data.</p>;
  }

  const totalPosts = data.postsByStatus.draft + data.postsByStatus.published + data.postsByStatus.archived;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Dashboard</h1>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="font-mono text-xs text-gray-mid">
              Last updated: {lastUpdated.toLocaleTimeString('en-US')}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="min-h-[44px] rounded-sm border border-gray-line px-4 text-sm font-medium hover:bg-gray-bg disabled:opacity-50"
          >
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total posts" value={totalPosts} />
        <StatCard label="Published" value={data.postsByStatus.published} />
        <StatCard label="Drafts" value={data.postsByStatus.draft} />
        <StatCard label="Active brokers" value={data.activeBrokerCount} />
        <StatCard label="Errors (24h)" value={data.recentErrorCount} alert />
      </div>

      <div className="mb-8 card-elevated rounded-sm border border-gray-line bg-gray-bg p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.06em] text-gray-mid">
          Affiliate clicks — last 30 days
        </h2>
        <TrendChart data={data.clickTrend} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card-elevated rounded-sm border border-gray-line bg-gray-bg p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.06em] text-gray-mid">
            Top posts by views
          </h2>
          {data.topPosts.length === 0 ? (
            <p className="text-sm text-gray-mid">No posts yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.topPosts.map((post) => (
                <li key={post.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/posts/${post.id}/edit`} className="truncate text-sm hover:underline">
                    {post.title}
                  </Link>
                  <span className="shrink-0 font-mono text-sm text-gray-mid">{post.view_count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card-elevated rounded-sm border border-gray-line bg-gray-bg p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.06em] text-gray-mid">
            Top brokers by clicks
          </h2>
          {data.topBrokers.length === 0 ? (
            <p className="text-sm text-gray-mid">No brokers yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {data.topBrokers.map((broker) => (
                <li key={broker.id} className="flex items-center justify-between gap-3">
                  <Link href={`/admin/brokers/${broker.id}/edit`} className="truncate text-sm hover:underline">
                    {broker.name}
                  </Link>
                  <span className="shrink-0 font-mono text-sm text-gray-mid">{broker.click_count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
