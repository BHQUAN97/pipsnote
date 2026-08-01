'use client';

import { useEffect } from 'react';

export interface DetailField {
  label: string;
  value: React.ReactNode;
}

interface DetailDrawerProps {
  open: boolean;
  title: string;
  loading: boolean;
  fields: DetailField[];
  editHref?: string;
  onClose: () => void;
}

export default function DetailDrawer({ open, title, loading, fields, editHref, onClose }: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close detail"
        onClick={onClose}
        className="absolute inset-0 bg-surface-dark/60"
      />
      <div className="card-elevated relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-gray-line bg-bg p-6 sm:p-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-gray-line text-lg"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-mid">Loading...</p>
        ) : (
          <div className="flex flex-col gap-4">
            {fields.map((field) => (
              <div key={field.label}>
                <div className="mb-1 font-mono text-label uppercase tracking-[0.06em] text-gray-mid">
                  {field.label}
                </div>
                <div className="text-sm leading-relaxed break-words">{field.value}</div>
              </div>
            ))}
          </div>
        )}

        {editHref && (
          <a
            href={editHref}
            className="mt-8 flex min-h-[44px] items-center justify-center rounded-sm bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
          >
            Edit
          </a>
        )}
      </div>
    </div>
  );
}
