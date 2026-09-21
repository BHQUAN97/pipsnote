'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (next.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/me/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Failed to change password');
        return;
      }
      setMessage('Password changed successfully');
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch {
      setError('Network connection error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Change password</h1>

      {error && <div className="p-3 bg-red text-white rounded-sm text-sm">{error}</div>}
      {message && (
        <div className="mb-4 rounded-md border border-brand/30 bg-brand/10 px-4 py-2 text-sm text-ink">
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm mb-2 font-medium">Current password</label>
          <Input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="w-full"
            disabled={saving}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">New password</label>
          <Input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="w-full"
            disabled={saving}
            required
          />
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium">Confirm new password</label>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full"
            disabled={saving}
            required
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Change password'}
          </button>
          <button type="button" onClick={() => router.push('/admin')} disabled={saving} className="btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}