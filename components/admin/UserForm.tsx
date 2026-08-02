'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUserRow } from '@/lib/types';
import Input from '@/components/ui/Input';

interface UserFormValues {
  username: string;
  email: string;
  password: string;
  role: 'superadmin' | 'editor' | 'author';
  is_active: boolean;
}

function toFormValues(user?: AdminUserRow | null): UserFormValues {
  return {
    username: user?.username ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? 'author',
    is_active: user ? Boolean(user.is_active) : true,
  };
}

export default function UserForm({ userId, initialUser }: { userId?: number; initialUser?: AdminUserRow }) {
  const router = useRouter();
  const [values, setValues] = useState<UserFormValues>(() => toFormValues(initialUser));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function update<K extends keyof UserFormValues>(key: K, value: UserFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload: Record<string, unknown> = {
      username: values.username,
      email: values.email,
      role: values.role,
      is_active: values.is_active,
    };
    if (values.password) {
      payload.password = values.password;
    }
    if (!userId && !values.password) {
      setError('Password is required');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(userId ? `/api/admin/users/${userId}` : '/api/admin/users', {
        method: userId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to save user');
        return;
      }

      router.push('/admin/users');
    } catch {
      setError('Network connection error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-3xl">
      {error && <div className="p-3 bg-red text-white rounded-sm text-sm">{error}</div>}

      <div>
        <label className="block text-sm mb-2 font-medium">Username</label>
        <Input
          type="text"
          value={values.username}
          onChange={(e) => update('username', e.target.value)}
          className="w-full"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">Email</label>
        <Input
          type="email"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          className="w-full"
          disabled={saving}
          required
        />
      </div>

      <div>
        <label className="block text-sm mb-2 font-medium">
          {userId ? 'New password (leave blank to keep current)' : 'Password'}
        </label>
        <Input
          type="password"
          value={values.password}
          onChange={(e) => update('password', e.target.value)}
          className="w-full"
          disabled={saving}
          minLength={8}
          required={!userId}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-2 font-medium">Role</label>
          <select
            value={values.role}
            onChange={(e) => update('role', e.target.value as UserFormValues['role'])}
            className="w-full min-h-[44px] px-4 py-2 border border-gray-line rounded-sm"
            disabled={saving}
          >
            <option value="author">Author</option>
            <option value="editor">Editor</option>
            <option value="superadmin">Superadmin</option>
          </select>
        </div>

        <div className="flex items-center gap-2 sm:pt-8">
          <input
            id="is_active"
            type="checkbox"
            checked={values.is_active}
            onChange={(e) => update('is_active', e.target.checked)}
            className="h-5 w-5"
            disabled={saving}
          />
          <label htmlFor="is_active" className="text-sm font-medium">
            Active
          </label>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 py-2 bg-brand text-white rounded-sm hover:bg-brand-dark disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save user'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/admin/users')}
          disabled={saving}
          className="min-h-[44px] px-6 py-2 border border-gray-line rounded-sm hover:bg-gray-bg disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
