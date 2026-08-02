'use client';

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface TagOption {
  id: number;
  name: string;
  slug: string;
}

interface TagInputProps {
  value: TagOption[];
  onChange: (tags: TagOption[]) => void;
  disabled?: boolean;
}

export default function TagInput({ value, onChange, disabled }: TagInputProps) {
  const [options, setOptions] = useState<TagOption[]>([]);
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/admin/tags')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setOptions(data.items ?? []))
      .catch(() => setOptions([]));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const suggestions = options.filter(
    (opt) =>
      !value.some((v) => v.id === opt.id) &&
      opt.name.toLowerCase().includes(input.trim().toLowerCase())
  );

  function addExistingTag(tag: TagOption) {
    onChange([...value, tag]);
    setInput('');
    setShowSuggestions(false);
  }

  async function addTagByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = options.find((opt) => opt.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!value.some((v) => v.id === existing.id)) {
        onChange([...value, existing]);
      }
      setInput('');
      setShowSuggestions(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) return;
      const created: TagOption = await res.json();
      setOptions((prev) => [...prev, created]);
      if (!value.some((v) => v.id === created.id)) {
        onChange([...value, created]);
      }
    } finally {
      setInput('');
      setShowSuggestions(false);
    }
  }

  function removeTag(id: number) {
    onChange(value.filter((tag) => tag.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      void addTagByName(input);
    } else if (e.key === 'Backspace' && input === '' && value.length > 0) {
      removeTag(value[value.length - 1].id);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-2 w-full min-h-[44px] px-3 py-2 border border-gray-line rounded-sm">
        {value.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-surface-dark text-white text-sm rounded-sm"
          >
            {tag.name}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="hover:opacity-70"
                aria-label={`Remove tag ${tag.name}`}
              >
                <X size={14} />
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={value.length === 0 ? 'Add tags...' : ''}
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
        />
      </div>

      {showSuggestions && input.trim() && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto border border-gray-line rounded-sm bg-white shadow-md">
          {suggestions.slice(0, 8).map((opt) => (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => addExistingTag(opt)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-bg"
              >
                {opt.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
