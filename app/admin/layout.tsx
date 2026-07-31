'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AdminUser } from '@/lib/auth';

const NAV_ITEMS: Array<{ href: string; label: string; roles: AdminUser['role'][] }> = [
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="flex flex-wrap items-center gap-1">
            <Link href="/admin/posts" className="mr-3 font-display text-lg">
              PIPSNOTE Admin
            </Link>
            {visibleItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-[44px] rounded px-3 py-2 text-sm font-medium flex items-center ${
                  pathname.startsWith(item.href)
                    ? 'bg-surface-dark text-white'
                    : 'hover:bg-gray-bg'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-mid">
              {user.username} ({user.role})
            </span>
            <button
              onClick={handleLogout}
              className="min-h-[44px] rounded border px-4 py-2 text-sm hover:bg-gray-bg"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-4 sm:p-8">{children}</main>
    </div>
  );
}
