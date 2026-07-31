'use client';

import { useSyncExternalStore } from 'react';

const THEME_EVENT = 'pipsnote-theme-change';

function subscribe(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function getServerSnapshot() {
  return false;
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next = !isDark;
    if (next) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Đổi giao diện sáng/tối"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-gray-line text-base"
    >
      {isDark ? '☀️' : '🌙'}
    </button>
  );
}
