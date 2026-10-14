import { db } from '@/db';
import { tombstonedTable } from '@/db/repositories/tombstoned-table';
import type { ChatMessage, NewChatMessage } from '@/types/chat-message';
import { generateUUID } from '@/utils/uuid';

const tombstones = tombstonedTable(db.chatMessages);

function byTimestampAsc(messages: ChatMessage[]): ChatMessage[] {
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

export const chatMessageRepository = {
  /** One session's live messages, oldest-first, the order a conversation is read and sent to the
   *  AI in. */
  async getBySession(sessionId: string): Promise<ChatMessage[]> {
    return byTimestampAsc(
      tombstones.live(await db.chatMessages.where('sessionId').equals(sessionId).toArray()),
    );
  },

  getAllIncludingDeleted: tombstones.getAllIncludingDeleted,

  async create(message: NewChatMessage): Promise<ChatMessage> {
    const timestamp = Date.now();
    const record: ChatMessage = {
      ...message,
      id: generateUUID(),
      timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await db.chatMessages.add(record);
    return record;
  },

  /** Tombstones every live message in the given sessions, alongside the sessions themselves, so
   *  the deletion reaches other devices instead of their copies flowing straight back in. */
  async softDeleteBySessions(sessionIds: string[], timestamp = Date.now()): Promise<void> {
    if (sessionIds.length === 0) return;
    await db.chatMessages
      .where('sessionId')
      .anyOf(sessionIds)
      .filter((message) => !message.isDeleted)
      .modify({ isDeleted: true, updatedAt: timestamp });
  },

  async bulkPut(messages: ChatMessage[]): Promise<void> {
    await db.chatMessages.bulkPut(messages);
  },

  async clear(): Promise<void> {
    await db.chatMessages.clear();
  },
};
