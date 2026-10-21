'use client';

import { useRef, useState } from 'react';

interface ImageUploaderProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  folder?: 'posts' | 'backgrounds';
  disabled?: boolean;
}

// Field ảnh dùng chung — upload file thay vì gõ URL.
// Upload qua /api/admin/upload, preview + nút xoá. Không có input URL.
export default function ImageUploader({ value, onChange, label, folder = 'posts', disabled }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (folder !== 'posts') fd.append('folder', folder);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }
      onChange(data.url);
    } catch {
      setError('Network error while uploading');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm mb-2">{label}</label>
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <div className="relative h-16 w-28 overflow-hidden rounded-sm border bg-gray-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-full w-full object-contain" />
          </div>
        ) : (
          <div className="flex h-16 w-28 items-center justify-center rounded-sm border text-xs text-gray-mid">
            Chưa có
          </div>
        )}
        <button
          type="button"
          onClick={() => onChange('')}
          disabled={!value || uploading || disabled}
          className="min-h-[44px] px-4 py-2 border rounded-sm text-sm hover:bg-gray-bg disabled:opacity-50"
        >
          Xoá ảnh
        </button>
        <label className="min-h-[44px] px-4 py-2 border rounded-sm text-sm hover:bg-gray-bg cursor-pointer flex items-center">
          {uploading ? 'Đang tải...' : 'Tải ảnh lên'}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            disabled={uploading || disabled}
            onChange={handleFileChange}
          />
        </label>
      </div>
      {error && <p className="mt-2 text-sm text-down">{error}</p>}
    </div>
  );
}
