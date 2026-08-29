'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Node, mergeAttributes } from '@tiptap/core';
import { useCallback, useRef, useState } from 'react';
import { cn } from '@creatorplus/ui';

/* ------------------------------------------------------------------ */
/*  Custom Iframe node                                                 */
/* ------------------------------------------------------------------ */
const Iframe = Node.create({
  name: 'iframe',
  group: 'block',
  atom: true,
  addAttributes() {
    return {
      src: { default: null },
      frameborder: { default: '0' },
      allowfullscreen: { default: true },
      allow: { default: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture' },
      width: { default: '100%' },
      height: { default: '400' },
    };
  },
  parseHTML() {
    return [{ tag: 'iframe' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['iframe', mergeAttributes(HTMLAttributes)];
  },
  addCommands() {
    return {
      setIframe:
        (options: { src: string; height?: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { src: options.src, height: options.height || '400' },
          });
        },
    } as any;
  },
});

/* ------------------------------------------------------------------ */
/*  Toolbar                                                            */
/* ------------------------------------------------------------------ */
function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        'rounded px-2 py-1 text-sm font-semibold transition',
        active ? 'bg-forest-100 text-forest-800' : 'text-ink-600 hover:bg-ink-100',
        disabled && 'pointer-events-none opacity-40',
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="mx-0.5 h-5 w-px bg-ink-200" />;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
}

export function RichTextEditor({ value, onChange, placeholder, id }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const linkInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'editor-link' } }),
      Youtube.configure({ width: 640, height: 360 }),
      Iframe,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: placeholder || 'Start writing...' }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => {
      onChange(e.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'rich-text-editor min-h-[10rem] px-3 py-2 text-sm leading-relaxed text-ink-900 outline-none',
        id: id || '',
      },
    },
  });

  const insertImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      // Convert to base64 for simplicity; in production you'd upload to R2
      const reader = new FileReader();
      reader.onloadend = () => {
        const src = reader.result as string;
        editor.chain().focus().setImage({ src, alt: file.name }).run();
      };
      reader.readAsDataURL(file);
      // Reset the input so the same file can be selected again
      e.target.value = '';
    },
    [editor],
  );

  const handleInsertLink = useCallback(() => {
    if (!linkUrl || !editor) return;
    const fullUrl = /^https?:\/\//i.test(linkUrl) ? linkUrl : `https://${linkUrl}`;
    editor.chain().focus().setLink({ href: fullUrl }).run();
    setLinkUrl('');
  }, [editor, linkUrl]);

  const handleInsertYoutube = useCallback(() => {
    const url = window.prompt('Paste a YouTube URL');
    if (!url || !editor) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const handleInsertIframe = useCallback(() => {
    const url = window.prompt('Paste an embed URL (e.g. CodePen, Figma, Loom)');
    if (!url || !editor) return;
    (editor.commands as any).setIframe({ src: url });
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-ink-100 bg-white transition focus-within:border-forest-500 focus-within:ring-2 focus-within:ring-forest-500/30">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-ink-100 bg-cream-50 px-2 py-1.5">
        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          title="Bold"
        >
          B
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          title="Italic"
        >
          I
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          title="Underline"
        >
          U
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          title="Inline code"
        >
          {'</>'}
        </ToolbarButton>

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          H3
        </ToolbarButton>

        <ToolbarDivider />

        {/* Lists & block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          &bull; List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          1. List
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          &#10077;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
        >
          &mdash;
        </ToolbarButton>

        <ToolbarDivider />

        {/* Alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          active={editor.isActive({ textAlign: 'left' })}
          title="Align left"
        >
          &#8676;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          active={editor.isActive({ textAlign: 'center' })}
          title="Align center"
        >
          &#8596;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          active={editor.isActive({ textAlign: 'right' })}
          title="Align right"
        >
          &#8677;
        </ToolbarButton>

        <ToolbarDivider />

        {/* Inserts */}
        <ToolbarButton onClick={insertImage} title="Insert image">
          &#128247;
        </ToolbarButton>

        {/* Link input */}
        <div className="flex items-center gap-1">
          <ToolbarButton
            onClick={() => {
              if (editor.isActive('link')) {
                editor.chain().focus().unsetLink().run();
              } else {
                linkInputRef.current?.focus();
              }
            }}
            active={editor.isActive('link')}
            title="Insert link"
          >
            &#128279;
          </ToolbarButton>
          <input
            ref={linkInputRef}
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleInsertLink();
              }
            }}
            placeholder="Paste URL & Enter"
            className="hidden w-40 rounded border border-ink-200 bg-white px-2 py-0.5 text-xs text-ink-700 focus:inline-block focus:border-forest-500 focus:outline-none"
          />
        </div>

        <ToolbarButton onClick={handleInsertYoutube} title="Embed YouTube video">
          &#9654;
        </ToolbarButton>
        <ToolbarButton onClick={handleInsertIframe} title="Embed iframe">
          &lt;/&gt;
        </ToolbarButton>

        <div className="flex-1" />

        {/* Undo / Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          &#8617;
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          &#8618;
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="min-h-[10rem]" />

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}
