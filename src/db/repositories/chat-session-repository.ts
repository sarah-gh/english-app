import { db } from '@/db';
import { tombstonedTable } from '@/db/repositories/tombstoned-table';
import { DEFAULT_CHAT_SESSION_TITLE, type ChatSession } from '@/types/chat-message';
import { generateUUID } from '@/utils/uuid';

const tombstones = tombstonedTable(db.chatSessions);

export const chatSessionRepository = {
  /** Most recently active first, the order the session list shows. */
  async getAll(): Promise<ChatSession[]> {
    return tombstones.live(await db.chatSessions.orderBy('updatedAt').reverse().toArray());
  },

  getAllIncludingDeleted: tombstones.getAllIncludingDeleted,

  getById: tombstones.getById,

  async create(): Promise<ChatSession> {
    const timestamp = Date.now();
    const record: ChatSession = {
      id: generateUUID(),
      title: DEFAULT_CHAT_SESSION_TITLE,
      titleUpdatedAt: null,
      lastMessagePreview: '',
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await db.chatSessions.add(record);
    return record;
  },

  async update(
    id: string,
    changes: Partial<Pick<ChatSession, 'title' | 'titleUpdatedAt' | 'lastMessagePreview'>>,
    timestamp = Date.now(),
  ): Promise<void> {
    await db.chatSessions.update(id, { ...changes, updatedAt: timestamp });
  },

  softDelete: tombstones.softDelete,

  async bulkPut(sessions: ChatSession[]): Promise<void> {
    await db.chatSessions.bulkPut(sessions);
  },

  async clear(): Promise<void> {
    await db.chatSessions.clear();
  },
};
