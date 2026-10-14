import DOMPurify from 'dompurify';

/** Tags the rich text editor (and AI-generated explanations) are allowed to produce. Anything
 *  else, scripts, styles, event handler attributes, embedded media, is stripped on the way in
 *  (editor updates) and again on the way out (rendering with `v-html`), since content can reach
 *  storage from places that don't go through the editor at all (AI Auto-Fill, JSON import). */
const RICH_TEXT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
];

/** Sanitizes a rich text HTML string down to the small set of formatting tags this app supports,
 *  with no attributes (no `style`, `href`, `on*` handlers, etc). Safe to store and to render with
 *  `v-html`. */
export function sanitizeRichText(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: RICH_TEXT_ALLOWED_TAGS, ALLOWED_ATTR: [] });
}

const BLOCK_TAG_END = /<\/(p|div|h[1-6]|li|ul|ol|blockquote)>/gi;
const BREAK_TAG = /<br\s*\/?>/gi;

/** Reduces a rich text HTML string to plain text for contexts that can't render markup, search
 *  haystacks, list-preview snippets, the matching-quiz game. Block boundaries and line breaks
 *  become spaces so words from adjacent paragraphs/list items don't run together. */
export function stripHtmlToText(html: string): string {
  const withBreaks = html.replace(BLOCK_TAG_END, '$& ').replace(BREAK_TAG, ' ');
  const text = DOMPurify.sanitize(withBreaks, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return text.replace(/\s+/g, ' ').trim();
}

const CHAT_ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'];

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderChatInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
}

/**
 * Renders an AI Tutor Chat reply's light Markdown (the subset its system prompt allows: **bold**,
 * *italics*, "- " / "1. " lists, blank-line paragraphs) to HTML safe for `v-html`. The input is
 * HTML-escaped before any tag is added, and the result still goes through DOMPurify, so a reply
 * containing literal markup is shown as text, never rendered.
 */
export function renderChatMarkdown(markdown: string): string {
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let list = null as { tag: 'ul' | 'ol'; items: string[] } | null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push(`<p>${paragraph.map(renderChatInline).join('<br>')}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) {
      const { tag, items } = list;
      blocks.push(`<${tag}>${items.map((item) => `<li>${item}</li>`).join('')}</${tag}>`);
    }
    list = null;
  };

  for (const rawLine of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const listMatch = bullet ?? numbered;

    if (listMatch) {
      const tag = bullet ? 'ul' : 'ol';
      flushParagraph();
      if (list?.tag !== tag) flushList();
      list ??= { tag, items: [] };
      list.items.push(renderChatInline(listMatch[1]));
    } else if (!line) {
      flushParagraph();
      flushList();
    } else {
      flushList();
      // Headings aren't in the allowed subset, but models still emit them now and then; keep the
      // text, drop the hashes.
      paragraph.push(line.replace(/^#{1,6}\s+/, ''));
    }
  }
  flushParagraph();
  flushList();

  return DOMPurify.sanitize(blocks.join(''), { ALLOWED_TAGS: CHAT_ALLOWED_TAGS, ALLOWED_ATTR: [] });
}
