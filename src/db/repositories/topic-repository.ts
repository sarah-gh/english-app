import { db } from '@/db';
import { tombstonedTable } from '@/db/repositories/tombstoned-table';
import type { NewTopic, Topic, TopicUpdate } from '@/types/topic';
import { generateUUID } from '@/utils/uuid';

/** See `tombstoned-table.ts`, one shared implementation of the "deleted rows stay, and only
 *  Cloud Sync sees them" rule, in place of a per-repository `excludeDeleted` copy. */
const tombstones = tombstonedTable(db.topics);

export const topicRepository = {
  /** `orderBy('name')` reads through the Dexie index rather than sorting in JS, the tombstone
   *  filter is applied to the rows that come back, leaving the query plan untouched. */
  async getAll(): Promise<Topic[]> {
    return tombstones.live(await db.topics.orderBy('name').toArray());
  },

  getAllIncludingDeleted: tombstones.getAllIncludingDeleted,

  getById: tombstones.getById,

  async getByDeck(deckId: string): Promise<Topic[]> {
    return tombstones
      .live(await db.topics.where('deckId').equals(deckId).toArray())
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  async create(topic: NewTopic): Promise<Topic> {
    const timestamp = Date.now();
    const record: Topic = {
      ...topic,
      id: generateUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await db.topics.add(record);
    return record;
  },

  async update(id: string, changes: TopicUpdate): Promise<void> {
    await db.topics.update(id, { ...changes, updatedAt: Date.now() });
  },

  /** Soft-deletes the topic and unassigns it from every card that references it, cards themselves
   *  are kept, they just fall back to being untagged-by-topic within their deck. Both the topic's
   *  tombstone and the cards' cleared `topicId` are timestamped so Cloud Sync replicates them. */
  async delete(id: string): Promise<void> {
    const timestamp = Date.now();
    await db.transaction('rw', db.topics, db.cards, async () => {
      await db.cards
        .where('topicId')
        .equals(id)
        .modify({ topicId: undefined, updatedAt: timestamp });
      await db.topics.update(id, { isDeleted: true, updatedAt: timestamp });
    });
  },

  /** Used by backup import and Cloud Sync, writes records as-is, preserving ids and timestamps. */
  async bulkPut(topics: Topic[]): Promise<void> {
    await db.topics.bulkPut(topics);
  },

  async clear(): Promise<void> {
    await db.topics.clear();
  },
};
