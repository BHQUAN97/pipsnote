'use client';

import { use, useEffect, useState } from 'react';
import UserForm from '@/components/admin/UserForm';
import type { AdminUserRow } from '@/lib/types';

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [user, setUser] = useState<AdminUserRow | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data: AdminUserRow) => setUser(data))
      .catch(() => setError('User not found'));
  }, [id]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Edit user</h1>
      {error && <div className="p-3 bg-red text-white rounded-sm text-sm">{error}</div>}
      {!error && !user && <p className="text-sm text-gray-mid">Loading...</p>}
      {user && <UserForm userId={user.id} initialUser={user} />}
    </div>
  );
}
