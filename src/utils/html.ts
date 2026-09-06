import DOMPurify from 'dompurify';

/** Tags the rich text editor (and AI-generated explanations) are allowed to produce. Anything
 *  else — scripts, styles, event handler attributes, embedded media — is stripped on the way in
 *  (editor updates) and again on the way out (rendering with `v-html`), since content can reach
 *  storage from places that don't go through the editor at all (AI Auto-Fill, JSON import). */
const RICH_TEXT_ALLOWED_TAGS = ['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4'];

/** Sanitizes a rich text HTML string down to the small set of formatting tags this app supports,
 *  with no attributes (no `style`, `href`, `on*` handlers, etc). Safe to store and to render with
 *  `v-html`. */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

const BLOCK_TAG_END = /<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi;
const BREAK_TAG = /<br\s*\/?>/gi;

/** Reduces a rich text HTML string to plain text for contexts that can't render markup — search
 *  haystacks, list-preview snippets, the matching-quiz game. Block boundaries and line breaks
 *  become spaces so words from adjacent paragraphs/list items don't run together. */
export function stripHtmlToText(html: string): string {
  const withBreaks = html.replace(BLOCK_TAG_END, '$& ').replace(BREAK_TAG, ' ');
  const text = DOMPurify.sanitize(withBreaks, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return text.replace(/\s+/g, ' ').trim();
}
