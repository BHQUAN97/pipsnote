'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import CharacterCount from '@tiptap/extension-character-count';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading2, Heading3, Quote, List, ListOrdered, Code,
  AlignLeft, AlignCenter, AlignRight,
  Link as LinkIcon, Image as ImageIcon, ImagePlus, Minus,
  Undo, Redo, Paintbrush, Highlighter, Eraser, ChevronDown, Type, Maximize2, Minimize2,
} from 'lucide-react';
import { isUrlSafe } from '@/lib/sanitize';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

const TEXT_COLORS = ['#111827', '#e11d2a', '#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626'];
const HIGHLIGHT_COLORS = ['#fef08a', '#bbf7d0', '#bfd9fe', '#fed7aa', '#fbcfe8', '#e9d5ff'];

export default function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false, validate: (href) => isUrlSafe(href), HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Viết nội dung bài viết…' }),
      Highlight.configure({ multicolor: true }),
      CharacterCount,
      TextStyle,
      Color,
    ],
    content: value ?? '',
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: 'article-content min-h-[320px] px-4 py-4 focus:outline-none' } },
  });

  const currentBlock = editor?.isActive('heading', { level: 2 }) ? 'h2'
    : editor?.isActive('heading', { level: 3 }) ? 'h3'
    : editor?.isActive('blockquote') ? 'quote'
    : editor?.isActive('codeBlock') ? 'code'
    : 'paragraph';

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !editor) return;
    setUploading(true);
    setUploadError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setUploadError(data.error || 'Upload failed'); return; }
      editor.chain().focus().setImage({ src: data.url }).run();
    } catch { setUploadError('Network error while uploading'); }
    finally { setUploading(false); }
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Nhập URL:', prev ?? 'https://');
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    if (!isUrlSafe(url)) { setUploadError('URL không hợp lệ'); return; }
    setUploadError('');
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const addImageUrl = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Nhập URL hình ảnh:');
    if (!url || !isUrlSafe(url)) { setUploadError('URL không hợp lệ'); return; }
    setUploadError('');
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const applyBlock = useCallback((value: string) => {
    if (!editor) return;
    if (value === 'paragraph') editor.chain().focus().setParagraph().run();
    else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (value === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
    else if (value === 'quote') editor.chain().focus().toggleBlockquote().run();
    else if (value === 'code') editor.chain().focus().toggleCodeBlock().run();
  }, [editor]);

  const applyFontSize = useCallback((size: string | null) => {
    if (!editor) return;
    if (size) editor.chain().focus().setMark('textStyle', { fontSize: size }).run();
    else editor.chain().focus().unsetMark('textStyle').run();
  }, [editor]);

  if (!editor) return null;

  const blockLabel = currentBlock === 'h2' ? 'Tiêu đề 2' : currentBlock === 'h3' ? 'Tiêu đề 3' : currentBlock === 'quote' ? 'Trích dẫn' : currentBlock === 'code' ? 'Code' : 'Đoạn văn';

  return (
    <div className="overflow-hidden rounded-md border border-gray-line bg-bg">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-line bg-gray-bg px-2 py-1.5">
        {/* Block type + font size merged label (simple select-like) */}
        <button
          type="button"
          onClick={() => { if (currentBlock === 'paragraph') editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
          title={`Khối hiện tại: ${blockLabel}`}
          className="flex h-9 items-center gap-1 rounded-md bg-surface-dark px-2 text-xs font-medium text-ink"
        >
          <Type size={14} /> <span className="hidden w-[72px] truncate sm:block">{blockLabel}</span> <ChevronDown size={12} />
        </button>

        <Sep />
        <TB active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="In đậm"><Bold size={15} /></TB>
        <TB active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="In nghiêng"><Italic size={15} /></TB>
        <TB active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Gạch chân"><UnderlineIcon size={15} /></TB>
        <TB active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} label="Gạch ngang"><Strikethrough size={15} /></TB>
        <Sep />
        <TB active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Danh sách"><List size={15} /></TB>
        <TB active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Đánh số"><ListOrdered size={15} /></TB>
        <TB active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Trích dẫn"><Quote size={15} /></TB>
        <TB active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} label="Code"><Code size={15} /></TB>
        <Sep />

        {/* Text color */}
        <div className="flex items-center gap-1 px-1">
          {TEXT_COLORS.map((c) => (
            <button key={c} type="button" title="Màu chữ" onClick={() => editor.chain().focus().setColor(c).run()}
              className="h-5 w-5 rounded-full border border-gray-line transition-transform hover:scale-110" style={{ backgroundColor: c }} />
          ))}
          <label className="relative flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-gray-line" title="Màu tuỳ chọn">
            <input type="color" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => editor.chain().focus().setColor(e.target.value).run()} />
            <Paintbrush size={11} />
          </label>
        </div>

        {/* Highlight */}
        <div className="flex items-center gap-1 px-1">
          {HIGHLIGHT_COLORS.map((c) => (
            <button key={c} type="button" title="Highlight" onClick={() => editor.chain().focus().toggleHighlight({ color: c }).run()}
              className="h-5 w-5 rounded border border-gray-line transition-transform hover:scale-110" style={{ backgroundColor: c }} />
          ))}
          <button type="button" title="Xoá highlight" onClick={() => editor.chain().focus().unsetHighlight().run()}
            className="flex h-5 items-center rounded border border-gray-line px-1 text-gray-mid hover:text-ink"><Highlighter size={12} /></button>
        </div>
        <Sep />

        <TB active={editor.isActive('link')} onClick={addLink} label="Liên kết"><LinkIcon size={15} /></TB>
        <TB onClick={() => fileInputRef.current?.click()} label="Upload ảnh" busy={uploading}><ImageIcon size={15} /></TB>
        <TB onClick={addImageUrl} label="Ảnh từ URL"><ImagePlus size={15} /></TB>
        <Sep />
        <TB onClick={() => editor.chain().focus().undo().run()} label="Hoàn tác" disabled={!editor.can().undo()}><Undo size={15} /></TB>
        <TB onClick={() => editor.chain().focus().redo().run()} label="Làm lại" disabled={!editor.can().redo()}><Redo size={15} /></TB>
        <TB onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()} label="Xoá định dạng"><Eraser size={15} /></TB>
      </div>

      <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFileChange} className="hidden" />
      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center justify-between gap-1 border-t border-gray-line bg-gray-bg px-3 py-1.5 text-xs text-gray-mid">
        <span>{editor.storage.characterCount?.words() ?? 0} từ · {editor.storage.characterCount?.characters() ?? 0} ký tự</span>
        <span className="hidden sm:block">Ctrl+B/I/U · Ctrl+Z hoàn tác</span>
        {uploadError && <span className="text-ink font-medium text-red">{uploadError}</span>}
      </div>
    </div>
  );
}

function Sep() { return <div className="mx-1 h-6 w-px bg-gray-line" />; }

function TB({ children, onClick, active, label, busy, disabled }: { children: ReactNode; onClick: () => void; active?: boolean; label: string; busy?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      className={`flex h-9 min-w-9 items-center justify-center rounded-md border transition-colors disabled:opacity-40 ${
        active ? 'border-brand bg-brand/15 text-brand' : 'border-transparent text-gray-mid hover:text-ink hover:bg-gray-bg'
      }`}
    >
      {children}
    </button>
  );
}