import { LEGACY_CHAT_SESSION_ID, type ChatMessage, type ChatSession } from '@/types/chat-message';

const MAX_TITLE_LENGTH = 48;
const MAX_PREVIEW_LENGTH = 90;

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1).trimEnd()}…` : text;
}

/** Strips the light Markdown the tutor uses (`**bold**`, `*italics*`, list markers) so a preview
 *  reads as plain text. */
function stripChatMarkdown(text: string): string {
  return text.replace(/\*\*?|^[-*•]\s+|^\d+[.)]\s+/gm, '');
}

/** A session's auto-generated title, from its first user message. */
export function titleFromMessage(content: string): string {
  return truncate(collapseWhitespace(stripChatMarkdown(content)), MAX_TITLE_LENGTH);
}

/** The one-line snippet shown under a session's title in the session list. */
export function previewFromMessage(message: Pick<ChatMessage, 'role' | 'content'>): string {
  const text = truncate(collapseWhitespace(stripChatMarkdown(message.content)), MAX_PREVIEW_LENGTH);
  return message.role === 'user' ? `You: ${text}` : text;
}

/** The session that pre-multi-thread (single conversation) history is moved into, built only from
 *  the messages themselves so two devices migrating the same history produce the same record. */
export function buildLegacyChatSession(messages: ChatMessage[]): ChatSession {
  const live = messages
    .filter((message) => !message.isDeleted)
    .sort((a, b) => a.timestamp - b.timestamp);
  const first = live[0];
  const last = live.at(-1);
  const timestamps = messages.map((message) => message.timestamp);
  return {
    id: LEGACY_CHAT_SESSION_ID,
    title: 'Earlier conversation',
    titleUpdatedAt: null,
    lastMessagePreview: last ? previewFromMessage(last) : '',
    createdAt: first?.timestamp ?? Math.min(...timestamps),
    updatedAt: last?.timestamp ?? Math.max(...timestamps),
    // A history that was cleared before the upgrade only has tombstones left.
    isDeleted: live.length === 0,
  };
}
