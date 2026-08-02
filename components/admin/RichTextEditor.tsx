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
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Paintbrush,
} from 'lucide-react';
import { isUrlSafe } from '@/lib/sanitize';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  disabled?: boolean;
}

const COLOR_SWATCHES = ['#111827', '#dc2626', '#2563eb', '#16a34a', '#d97706'];

export default function RichTextEditor({ value, onChange, disabled }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        validate: (href) => isUrlSafe(href),
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Write the post content…' }),
      Highlight,
      CharacterCount,
      TextStyle,
      Color,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'article-content min-h-[280px] px-4 py-3 focus:outline-none',
      },
    },
  });

  const handleImagePick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !editor) return;

      setUploading(true);
      setUploadError('');

      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          setUploadError(data.error || 'Upload failed');
          return;
        }

        editor.chain().focus().setImage({ src: data.url }).run();
      } catch {
        setUploadError('Network error while uploading');
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', previous ?? 'https://');
    if (url === null) return;

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (!isUrlSafe(url)) {
      setUploadError('Unsafe URL rejected');
      return;
    }

    setUploadError('');
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="rounded-sm border border-gray-line">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-line bg-gray-bg p-1">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} label="Bold">
          <Bold size={18} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italic">
          <Italic size={18} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Underline">
          <UnderlineIcon size={18} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} label="Strikethrough">
          <Strikethrough size={18} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="Heading 2"
        >
          <Heading2 size={18} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="Heading 3"
        >
          <Heading3 size={18} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Bullet list">
          <List size={18} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          label="Numbered list"
        >
          <ListOrdered size={18} />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Quote">
          <Quote size={18} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton
          active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          label="Align left"
        >
          <AlignLeft size={18} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          label="Align center"
        >
          <AlignCenter size={18} />
        </ToolbarButton>
        <ToolbarButton
          active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          label="Align right"
        >
          <AlignRight size={18} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton active={editor.isActive('link')} onClick={setLink} label="Link">
          <LinkIcon size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={handleImagePick} label="Insert image" busy={uploading}>
          <ImageIcon size={18} />
        </ToolbarButton>

        <Divider />

        <div className="flex items-center gap-1 px-1">
          {COLOR_SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              title={color}
              onClick={() => editor.chain().focus().setColor(color).run()}
              className="h-6 w-6 rounded-full border border-gray-line"
              style={{ backgroundColor: color }}
            />
          ))}
          <button
            type="button"
            title="Reset color"
            onClick={() => editor.chain().focus().unsetColor().run()}
            className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-line"
          >
            <Paintbrush size={14} />
          </button>
        </div>

        <Divider />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} label="Undo">
          <Undo size={18} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} label="Redo">
          <Redo size={18} />
        </ToolbarButton>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      <EditorContent editor={editor} />

      <div className="flex items-center justify-between border-t border-gray-line px-3 py-1 text-sm text-gray-mid">
        <span>{editor.storage.characterCount.characters()} characters</span>
        {uploadError && <span className="text-red">{uploadError}</span>}
      </div>
    </div>
  );
}

function Divider() {
  return <div className="mx-1 h-6 w-px bg-gray-line" />;
}

function ToolbarButton({
  children,
  onClick,
  active,
  label,
  busy,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      disabled={busy}
      className={`flex h-11 w-11 items-center justify-center rounded-sm border border-gray-line transition-colors disabled:opacity-50 ${
        active ? 'bg-surface-dark text-white' : 'hover:bg-gray-bg'
      }`}
    >
      {children}
    </button>
  );
}
