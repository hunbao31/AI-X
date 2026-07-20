'use client';

import { useMemo } from 'react';
import katex from 'katex';

// Renders text with embedded LaTeX via KaTeX:
//   inline  → $...$
//   block   → $$...$$
// Content is stored as raw LaTeX strings; rendering happens client-side at
// display time. If a snippet fails to parse, it falls back to the original
// plain text instead of crashing or showing an error box.
//
// KaTeX is configured with trust:false, so LaTeX from teachers/CSV imports
// cannot inject links or raw HTML.

type Segment =
  | { type: 'text'; content: string }
  | { type: 'math'; latex: string; display: boolean };

// $$...$$ first (may span lines), then single-line $...$.
const MATH_PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g;

function splitSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;

  MATH_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MATH_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: 'math', latex: match[1], display: true });
    } else {
      segments.push({ type: 'math', latex: match[2], display: false });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return segments;
}

interface MathTextProps {
  text: string;
  className?: string;
}

export function MathText({ text, className = '' }: MathTextProps) {
  const content = useMemo(() => {
    // Fast path: no math delimiters → plain text, zero KaTeX work.
    if (!text || !text.includes('$')) return null;

    return splitSegments(text).map((segment, i) => {
      if (segment.type === 'text') {
        return <span key={i}>{segment.content}</span>;
      }
      try {
        const html = katex.renderToString(segment.latex, {
          displayMode: segment.display,
          throwOnError: true,
          strict: 'ignore',
          trust: false,
        });
        return (
          <span
            key={i}
            className={segment.display ? 'my-2 block overflow-x-auto' : ''}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      } catch {
        // Invalid LaTeX → show the raw source as plain text.
        return (
          <span key={i}>
            {segment.display ? `$$${segment.latex}$$` : `$${segment.latex}$`}
          </span>
        );
      }
    });
  }, [text]);

  if (content === null) return <span className={className}>{text}</span>;
  return <span className={className}>{content}</span>;
}
