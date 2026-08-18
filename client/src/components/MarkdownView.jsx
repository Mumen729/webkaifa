import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({ gfm: true, breaks: true });

/** Render Markdown (or raw HTML) safely. */
export default function MarkdownView({ content, md, html }) {
  const rendered = useMemo(() => {
    const src = html || md || content || '';
    const raw = html ? src : marked.parse(src);
    return DOMPurify.sanitize(raw, { ADD_ATTR: ['target'] });
  }, [content, md, html]);

  if (!rendered) return null;
  return <div className="article-body" dangerouslySetInnerHTML={{ __html: rendered }} />;
}
