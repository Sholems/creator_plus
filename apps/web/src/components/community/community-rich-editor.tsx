'use client';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';

export function CommunityRichEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'min-h-36 px-4 py-3 text-sm leading-7 text-ink-800 outline-none',
        'aria-label': placeholder || 'Rich text content',
      },
    },
  });
  if (!editor) return <div className="h-36 animate-pulse rounded-xl bg-cream-100" />;
  const control = (label: string, active: boolean, action: () => void) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={action}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? 'bg-forest-800 text-white' : 'text-ink-600 hover:bg-cream-100'}`}
    >
      {label}
    </button>
  );
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-white focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-500/20">
      <div className="flex flex-wrap gap-1 border-b border-ink-100 bg-cream-50 p-2">
        {control('Bold', editor.isActive('bold'), () => {
          editor.chain().focus().toggleBold().run();
        })}
        {control('Italic', editor.isActive('italic'), () => {
          editor.chain().focus().toggleItalic().run();
        })}
        {control('Heading', editor.isActive('heading', { level: 2 }), () => {
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        })}
        {control('Bullets', editor.isActive('bulletList'), () => {
          editor.chain().focus().toggleBulletList().run();
        })}
        {control('Quote', editor.isActive('blockquote'), () => {
          editor.chain().focus().toggleBlockquote().run();
        })}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
