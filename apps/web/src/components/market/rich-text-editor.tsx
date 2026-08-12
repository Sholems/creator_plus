'use client';

import { useEffect, useRef } from 'react';
import { sanitizeRichText } from '@/lib/rich-text';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  id?: string;
}

interface Tool {
  cmd: string;
  value?: string;
  label: string;
  content: string;
  title: string;
}

const TOOLS: Tool[] = [
  { cmd: 'bold', label: 'Bold', content: 'B', title: 'Bold' },
  { cmd: 'italic', label: 'Italic', content: 'I', title: 'Italic' },
  { cmd: 'underline', label: 'Underline', content: 'U', title: 'Underline' },
  { cmd: 'formatBlock', value: 'h2', label: 'Heading', content: 'H2', title: 'Heading' },
  { cmd: 'formatBlock', value: 'h3', label: 'Subheading', content: 'H3', title: 'Subheading' },
  { cmd: 'insertUnorderedList', label: 'Bullet list', content: '• List', title: 'Bullet list' },
  { cmd: 'insertOrderedList', label: 'Numbered list', content: '1. List', title: 'Numbered list' },
  { cmd: 'formatBlock', value: 'blockquote', label: 'Quote', content: '❝', title: 'Quote' },
];

export function RichTextEditor({ value, onChange, placeholder, id }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (el && !focused.current && el.innerHTML !== value) {
      el.innerHTML = value || '';
    }
  }, [value]);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange(sanitizeRichText(el.innerHTML));
  };

  const exec = (tool: Tool) => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(tool.cmd, false, tool.value);
    emit();
  };

  const insertLink = () => {
    const el = editorRef.current;
    if (!el) return;
    const url = window.prompt('Enter link URL');
    if (!url) return;
    el.focus();
    document.execCommand('createLink', false, url);
    emit();
  };

  return (
    <div className="overflow-hidden rounded-md border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 bg-gray-50 px-2 py-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.title}
            type="button"
            title={tool.title}
            aria-label={tool.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(tool)}
            className="rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200"
          >
            {tool.content}
          </button>
        ))}
        <button
          type="button"
          title="Link"
          aria-label="Link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={insertLink}
          className="rounded px-2 py-1 text-sm font-semibold text-gray-700 hover:bg-gray-200"
        >
          🔗
        </button>
      </div>
      <div
        ref={editorRef}
        id={id}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder || ''}
        onInput={emit}
        onFocus={() => (focused.current = true)}
        onBlur={() => (focused.current = false)}
        className="rich-text-editor min-h-40 px-3 py-2 text-sm leading-relaxed text-gray-900 outline-none empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
      />
    </div>
  );
}
