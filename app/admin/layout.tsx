'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminUser } from '@/lib/auth';

const NAV_ITEMS: Array<{ href: string; label: string; roles: AdminUser['role'][] }> = [
  { href: '/admin', label: 'Dashboard', roles: ['superadmin', 'editor'] },
  { href: '/admin/posts', label: 'Posts', roles: ['superadmin', 'editor', 'author'] },
  { href: '/admin/brokers', label: 'Brokers', roles: ['superadmin', 'editor'] },
  { href: '/admin/market-data', label: 'Market Data', roles: ['superadmin'] },
  { href: '/admin/users', label: 'Users', roles: ['superadmin'] },
  { href: '/admin/settings', label: 'Settings', roles: ['superadmin'] },
  { href: '/admin/logs', label: 'Logs', roles: ['superadmin'] },
];

// Icon đơn giản (unicode) cho từng nav item
const NAV_ICON: Record<string, string> = {
  Dashboard: '▦',
  Posts: '✎',
  Brokers: '◈',
  'Market Data': '◍',
  Users: '☻',
  Settings: '⚙',
  Logs: '☰',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: AdminUser) => {
        setUser(data);
        setChecked(true);
      })
      .catch(() => router.replace('/admin/login'));
  }, [pathname, router]);

  if (pathname === '/admin/login') return <>{children}</>;

  if (!checked || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--gray-mid)' }}>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading…
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  return (
    <div className="admin-scope min-h-screen" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      {/* Top bar */}
      <header
        className="sticky top-0 z-40 border-b"
        style={{
          background: 'linear-gradient(180deg, var(--surface-dark) 0%, var(--bg) 100%)',
          borderColor: 'var(--gray-line)',
        }}
      >
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-2 font-display text-lg tracking-tight">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-white text-base"
              style={{ background: 'var(--red)' }}
            >
              P
            </span>
            PIPSNOTE
            <span className="hidden text-sm font-normal sm:inline" style={{ color: 'var(--gray-mid)' }}>
              Admin
            </span>
          </Link>

          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive(item.href) ? 'text-white' : 'hover:bg-white/5'
                }`}
                style={isActive(item.href) ? { background: 'color-mix(in srgb, var(--red) 16%, transparent)' } : undefined}
              >
                <span style={{ color: isActive(item.href) ? 'var(--red)' : 'var(--gray-mid)' }} className="text-sm leading-none">
                  {NAV_ICON[item.label]}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <span className="hidden rounded-md px-2.5 py-1 text-xs font-medium sm:inline" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--gray-mid)' }}>
              {user.username} · {user.role}
            </span>
            <button
              onClick={handleLogout}
              className="flex h-9 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors hover:bg-white/5"
              style={{ color: 'var(--gray-mid)' }}
            >
              <span>⎋</span> Logout
            </button>
            <button
              type="button"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label="Menu"
              className="flex h-10 w-10 items-center justify-center rounded-md text-lg lg:hidden hover:bg-white/5"
            >
              {drawerOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {drawerOpen && (
          <nav className="border-t px-3 py-2 lg:hidden" style={{ borderColor: 'var(--gray-line)' }}>
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawerOpen(false)}
                className="flex min-h-[44px] items-center gap-3 rounded-md px-3 text-sm font-medium hover:bg-white/5"
                style={isActive(item.href) ? { color: 'var(--red)' } : undefined}
              >
                <span style={{ color: 'var(--gray-mid)' }}>{NAV_ICON[item.label]}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Content */}
      <main className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}