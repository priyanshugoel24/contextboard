import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { SafeMarkdownProps } from '@/interfaces/ui-components';

export default async function SafeMarkdown({ content, className = '' }: SafeMarkdownProps) {
  const sanitizedHtml = DOMPurify.sanitize(await marked.parse(content));

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}
