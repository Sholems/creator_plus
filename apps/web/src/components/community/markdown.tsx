'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/** Safe markdown renderer (no raw HTML). Links open in a new tab. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose prose-sm max-w-none break-words text-ink-800 prose-headings:text-ink-900 prose-a:text-forest-700 prose-strong:text-ink-900">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer nofollow" />,
          // Images come from the attachment uploader, not inline markdown.
          img: () => null,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
