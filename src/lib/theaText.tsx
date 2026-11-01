import React from 'react';

/**
 * Cleans a Thea reply for display: Markdown links keep their label, bare supplier URLs and
 * internal marker lines are removed, and heading/bullet syntax is dropped. Bold stays as
 * `**text**` for `renderTheaText` to style.
 */
export function cleanTheaText(text: string): string {
  return hideProductIds(text)
    .replace(/^\s*(RECOMMENDED_IDS|GIFT_REVIEW):.*$/gim, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\((?:https?:\/\/|www\.)[^)]*\)/g, '$1')
    .replace(/\(?\b(?:https?:\/\/|www\.)\S+\)?/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '• ')
    .replace(/\s*[—–]\s*/g, ', ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * A tapped product card sends "I'd like the X (product <id>)." so Thea can pick the exact item;
 * the id is for her, not for the user's bubble.
 */
export function hideProductIds(text: string): string {
  return text.replace(/\s*\(product [\w-]*\d[\w-]*\)/gi, '');
}

const renderInline =(line: string, keyPrefix: string) =>
  line
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
        : <React.Fragment key={`${keyPrefix}-${i}`}>{part.replace(/\*\*/g, '')}</React.Fragment>,
    );

/** Renders cleaned Thea text with bold spans and line breaks. */
export function renderTheaText(text: string) {
  return text.split('\n').map((line, i, lines) => (
    <React.Fragment key={i}>
      {renderInline(line, String(i))}
      {i < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}
