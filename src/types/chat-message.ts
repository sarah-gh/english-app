export type ChatRole = 'user' | 'assistant' | 'system';

/** One AI Tutor Chat conversation thread. */
export interface ChatSession {
  id: string;
  /** Auto-generated from the session's first user message until the user renames it. */
  title: string;
  /** When `title` was last set by the user (`null` while it's still auto-generated). Tracked
   *  separately from `updatedAt` so Cloud Sync can keep a rename made on one device even when the
   *  other device's copy of the session is newer because a message was added there since (see
   *  `mergeChatSessions`). */
  titleUpdatedAt: number | null;
  /** Plain-text snippet of the newest message, shown in the session list. */
  lastMessagePreview: string;
  createdAt: number;
  /** Bumped on every new message and rename, so the session list sorts most-recent-first. */
  updatedAt: number;
  /** Soft-delete flag, see `Card.isDeleted` for why deletes don't hard-remove the row. */
  isDeleted: boolean;
}

/** One persisted AI Tutor Chat message. Only `user`/`assistant` turns are ever stored, the
 *  `system` prompt is rebuilt from the user's current cards on every send (see
 *  `buildTutorSystemPrompt`), so a stale vocabulary snapshot never gets frozen into history. */
export interface ChatMessage {
  id: string;
  sessionId: string;
  role: ChatRole;
  content: string;
  timestamp: number;
  /** Messages are never edited, so this normally mirrors `timestamp`; it changes only when the
   *  message's session is deleted and the message is tombstoned with it, which is what lets the
   *  deletion replicate through Cloud Sync's last-write-wins `mergeById`. */
  updatedAt: number;
  isDeleted: boolean;
}

export type NewChatMessage = Pick<ChatMessage, 'sessionId' | 'role' | 'content'>;

/** Fixed id for the session that pre-multi-thread chat history is moved into. Fixed rather than
 *  generated so every device migrating the same old history (locally, or from an older sync
 *  payload) lands it in the *same* session instead of each minting its own duplicate. */
export const LEGACY_CHAT_SESSION_ID = 'legacy-chat-session';

export const DEFAULT_CHAT_SESSION_TITLE = 'New chat';
