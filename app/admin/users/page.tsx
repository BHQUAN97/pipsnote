'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DetailDrawer, { type DetailField } from '@/components/admin/DetailDrawer';
import type { AdminUserRow } from '@/lib/types';

export default function AdminUsersPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminUserRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageSize = 20;

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

    fetch(`/api/admin/users?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: number, username: string) {
    if (!window.confirm(`Delete user "${username}"?`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if (res.ok) {
      load();
      return;
    }
    const data = await res.json().catch(() => ({}));
    window.alert(data.error || 'Failed to delete user');
  }

  function openDetail(id: number) {
    setDetailId(id);
    setDetail(null);
    setDetailLoading(true);
    fetch(`/api/admin/users/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: AdminUserRow) => setDetail(data))
      .finally(() => setDetailLoading(false));
  }

  function handleRowClick(id: number) {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      openDetail(id);
      clickTimer.current = null;
    }, 220);
  }

  function handleRowDoubleClick(id: number) {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
    router.push(`/admin/users/${id}/edit`);
  }

  const detailFields: DetailField[] = detail
    ? [
        { label: 'Username', value: detail.username },
        { label: 'Email', value: detail.email },
        { label: 'Role', value: detail.role },
        { label: 'Status', value: detail.is_active ? 'active' : 'inactive' },
        { label: 'Last login', value: detail.last_login_at ?? '—' },
        { label: 'Created', value: detail.created_at },
      ]
    : [];

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold sm:text-3xl">Users</h1>
        <Link
          href="/admin/users/new"
          className="min-h-[44px] rounded-sm bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark flex items-center"
        >
          + New user
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-gray-mid">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-mid">No users yet.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto border border-gray-line sm:block">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-gray-line bg-gray-bg text-left">
                  <th className="p-3">Username</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Status</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleRowClick(user.id)}
                    onDoubleClick={() => handleRowDoubleClick(user.id)}
                    className="cursor-pointer border-b border-gray-line last:border-0 hover:bg-gray-bg"
                  >
                    <td className="p-3 font-medium">{user.username}</td>
                    <td className="p-3 text-gray-mid">{user.email}</td>
                    <td className="p-3 text-gray-mid">{user.role}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-sm px-2 py-1 font-mono text-xs ${
                          user.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                        }`}
                      >
                        {user.is_active ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="p-3" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-3">
                        <Link href={`/admin/users/${user.id}/edit`} className="text-brand hover:underline">
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(user.id, user.username)}
                          className="text-down hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 sm:hidden">
            {items.map((user) => (
              <div
                key={user.id}
                onClick={() => openDetail(user.id)}
                className="cursor-pointer border border-gray-line p-4 hover:bg-gray-bg"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium leading-snug">{user.username}</span>
                  <span
                    className={`shrink-0 rounded-sm px-2 py-1 font-mono text-xs ${
                      user.is_active ? 'bg-up text-white' : 'bg-gray-bg'
                    }`}
                  >
                    {user.is_active ? 'active' : 'inactive'}
                  </span>
                </div>
                <div className="mt-1 text-sm text-gray-mid">
                  {user.email} · {user.role}
                </div>
                <div className="mt-3 flex items-center gap-5" onClick={(e) => e.stopPropagation()}>
                  <Link
                    href={`/admin/users/${user.id}/edit`}
                    className="flex min-h-[44px] items-center text-brand hover:underline"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(user.id, user.username)}
                    className="flex min-h-[44px] items-center text-down hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
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

      <DetailDrawer
        open={detailId !== null}
        title="User detail"
        loading={detailLoading}
        fields={detailFields}
        editHref={detailId ? `/admin/users/${detailId}/edit` : undefined}
        onClose={() => setDetailId(null)}
      />
    </div>
  );
}
