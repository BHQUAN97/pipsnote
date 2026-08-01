'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminUser } from '@/lib/auth';

const NAV_ITEMS: Array<{ href: string; label: string; roles: AdminUser['role'][] }> = [
  { href: '/admin', label: 'Dashboard', roles: ['superadmin', 'editor'] },
  { href: '/admin/posts', label: 'Posts', roles: ['superadmin', 'editor', 'author'] },
  { href: '/admin/brokers', label: 'Brokers', roles: ['superadmin', 'editor'] },
  { href: '/admin/settings', label: 'Settings', roles: ['superadmin'] },
  { href: '/admin/logs', label: 'Logs', roles: ['superadmin'] },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checked, setChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      return;
    }

    fetch('/api/admin/me')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: AdminUser) => {
        setUser(data);
        setChecked(true);
      })
      .catch(() => {
        router.replace('/admin/login');
      });
  }, [pathname, router]);

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!checked || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-bg">Loading...</div>;
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
  };

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-gray-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex items-center gap-1">
            <Link href="/admin/posts" className="mr-3 font-display text-lg">
              PIPSNOTE Admin
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[44px] items-center rounded-sm px-3 py-2 text-sm font-medium ${
                    pathname.startsWith(item.href)
                      ? 'bg-surface-dark text-white'
                      : 'hover:bg-gray-bg'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="text-sm text-gray-mid">
              {user.username} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="min-h-[44px] rounded-sm border border-gray-line px-4 py-2 text-sm hover:bg-gray-bg"
            >
              Logout
            </button>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen((open) => !open)}
            aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={drawerOpen}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-gray-line text-lg md:hidden"
          >
            {drawerOpen ? '✕' : '☰'}
          </button>
        </div>
        {drawerOpen && (
          <nav className="card-elevated border-t border-gray-line bg-bg px-4 py-3 md:hidden">
            <div className="flex flex-col gap-1">
              {visibleItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setDrawerOpen(false)}
                  className={`flex min-h-[44px] items-center rounded-sm px-3 py-2 text-sm font-medium ${
                    pathname.startsWith(item.href)
                      ? 'bg-surface-dark text-white'
                      : 'hover:bg-gray-bg'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-gray-line pt-3">
              <span className="text-sm text-gray-mid">
                {user.username} ({user.role})
              </span>
              <button
                onClick={handleLogout}
                className="min-h-[44px] rounded-sm border border-gray-line px-4 py-2 text-sm hover:bg-gray-bg"
              >
                Logout
              </button>
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
