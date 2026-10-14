import { mergeById, type MergeResult } from '@/services/sync/merge';
import { LEGACY_CHAT_SESSION_ID, type ChatMessage, type ChatSession } from '@/types/chat-message';
import { buildLegacyChatSession, previewFromMessage } from '@/utils/chat-session';

/**
 * Merges AI Tutor Chat sessions by `id`. Mostly `mergeById`'s whole-record last-write-wins, with
 * two exceptions:
 *
 * - **Deletion is sticky.** If either side has tombstoned the session, the tombstone wins even when
 *   the other side's copy is newer, a session is never un-deleted, and without this a device that
 *   kept chatting offline would resurrect a thread the user deliberately deleted elsewhere.
 * - **The title is merged on its own clock.** Every new message bumps a session's `updatedAt`, so
 *   plain last-write-wins would let "I sent a message on my phone" silently overwrite "I renamed
 *   the thread on my laptop". `titleUpdatedAt` decides the title instead; the rest of the record
 *   (preview, `updatedAt`) still comes from whichever side is newer.
 */
export function mergeChatSessions(
  local: ChatSession[],
  remote: ChatSession[],
): MergeResult<ChatSession> {
  const localById = new Map(local.map((session) => [session.id, session]));
  const base = mergeById(local, remote);
  const remoteById = new Map(remote.map((session) => [session.id, session]));

  const merged = base.merged.map((winner) => {
    const localItem = localById.get(winner.id);
    const remoteItem = remoteById.get(winner.id);
    if (!localItem || !remoteItem) return winner;

    const isDeleted = localItem.isDeleted || remoteItem.isDeleted;
    const titleSource =
      (remoteItem.titleUpdatedAt ?? -1) > (localItem.titleUpdatedAt ?? -1) ? remoteItem : localItem;
    const resolved: ChatSession = {
      ...winner,
      title: titleSource.title,
      titleUpdatedAt: titleSource.titleUpdatedAt,
      isDeleted,
      updatedAt: Math.max(localItem.updatedAt, remoteItem.updatedAt),
    };
    return isSameSession(resolved, localItem) ? localItem : resolved;
  });

  return {
    merged,
    toApplyLocally: merged.filter((session) => session !== localById.get(session.id)),
  };
}

function isSameSession(a: ChatSession, b: ChatSession): boolean {
  return (
    a.title === b.title &&
    a.titleUpdatedAt === b.titleUpdatedAt &&
    a.lastMessagePreview === b.lastMessagePreview &&
    a.updatedAt === b.updatedAt &&
    a.isDeleted === b.isDeleted
  );
}

/** Messages from a payload written before chat became multi-thread carry no `sessionId`; they all
 *  belong to the fixed-id legacy session, same as the local Dexie v10 migration does. */
export function normalizeLegacyChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((message) =>
    message.sessionId ? message : { ...message, sessionId: LEGACY_CHAT_SESSION_ID },
  );
}

export interface ReconciledChatData {
  sessions: ChatSession[];
  messages: ChatMessage[];
}

/**
 * Settles the already-merged sessions and messages against each other, since each was merged
 * independently and they can now disagree:
 *
 * 1. Legacy messages with no legacy session yet get one (see `buildLegacyChatSession`).
 * 2. A live message whose session is deleted (or gone entirely) is tombstoned too, e.g. a reply
 *    another device saved offline into a thread deleted here.
 * 3. Each live session's `lastMessagePreview`/`updatedAt` is recomputed from its newest message, so
 *    two devices that each added messages to the same thread end up showing the true latest one.
 *    It's derived purely from the merged data, so every device computes the same result and the
 *    next sync doesn't flip it back and forth.
 */
export function reconcileChatData(
  sessions: ChatSession[],
  messages: ChatMessage[],
  now = Date.now(),
): ReconciledChatData {
  const reconciledSessions = [...sessions];
  const sessionById = new Map(reconciledSessions.map((session) => [session.id, session]));

  if (!sessionById.has(LEGACY_CHAT_SESSION_ID)) {
    const legacyMessages = messages.filter((m) => m.sessionId === LEGACY_CHAT_SESSION_ID);
    if (legacyMessages.length > 0) {
      const legacy = buildLegacyChatSession(legacyMessages);
      reconciledSessions.push(legacy);
      sessionById.set(legacy.id, legacy);
    }
  }

  const newestBySession = new Map<string, ChatMessage>();
  const reconciledMessages = messages.map((message) => {
    if (message.isDeleted) return message;
    const session = sessionById.get(message.sessionId);
    if (!session || session.isDeleted) return { ...message, isDeleted: true, updatedAt: now };

    const newest = newestBySession.get(message.sessionId);
    if (
      !newest ||
      message.timestamp > newest.timestamp ||
      (message.timestamp === newest.timestamp && message.id > newest.id)
    ) {
      newestBySession.set(message.sessionId, message);
    }
    return message;
  });

  return {
    sessions: reconciledSessions.map((session) => {
      const newest = newestBySession.get(session.id);
      if (session.isDeleted || !newest) return session;
      const lastMessagePreview = previewFromMessage(newest);
      const updatedAt = Math.max(session.updatedAt, newest.timestamp);
      return lastMessagePreview === session.lastMessagePreview && updatedAt === session.updatedAt
        ? session
        : { ...session, lastMessagePreview, updatedAt };
    }),
    messages: reconciledMessages,
  };
}

/** The subset of `final` that differs (by reference) from what this device already holds. */
export function changedSince<T extends { id: string }>(local: T[], final: T[]): T[] {
  const localById = new Map(local.map((item) => [item.id, item]));
  return final.filter((item) => item !== localById.get(item.id));
}
