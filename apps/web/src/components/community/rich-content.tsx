import { Markdown } from './markdown';
import { RichText } from '@/components/market/rich-text';

export function CommunityRichContent({ body, format }: { body: string; format?: string }) {
  return format === 'RICH_HTML' ? <RichText html={body} /> : <Markdown>{body}</Markdown>;
}
