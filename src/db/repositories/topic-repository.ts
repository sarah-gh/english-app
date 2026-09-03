import { db } from '@/db';
import type { NewTopic, Topic, TopicUpdate } from '@/types/topic';

function excludeDeleted(topics: Topic[]): Topic[] {
  return topics.filter((topic) => !topic.isDeleted);
}

export const topicRepository = {
  async getAll(): Promise<Topic[]> {
    return excludeDeleted(await db.topics.orderBy('name').toArray());
  },

  /** Used by Cloud Sync, which needs tombstones too so a deletion on one device replicates to the
   *  others instead of being invisible to the merge. */
  async getAllIncludingDeleted(): Promise<Topic[]> {
    return db.topics.toArray();
  },

  async getById(id: string): Promise<Topic | undefined> {
    return db.topics.get(id);
  },

  async getByDeck(deckId: string): Promise<Topic[]> {
    return excludeDeleted(await db.topics.where('deckId').equals(deckId).toArray()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  },

  async create(topic: NewTopic): Promise<Topic> {
    const timestamp = Date.now();
    const record: Topic = {
      ...topic,
      id: crypto.randomUUID(),
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

  /** Soft-deletes the topic and unassigns it from every card that references it — cards themselves
   *  are kept, they just fall back to being untagged-by-topic within their deck. Both the topic's
   *  tombstone and the cards' cleared `topicId` are timestamped so Cloud Sync replicates them. */
  async delete(id: string): Promise<void> {
    const timestamp = Date.now();
    await db.transaction('rw', db.topics, db.cards, async () => {
      await db.cards.where('topicId').equals(id).modify({ topicId: undefined, updatedAt: timestamp });
      await db.topics.update(id, { isDeleted: true, updatedAt: timestamp });
    });
  },

  /** Used by backup import and Cloud Sync — writes records as-is, preserving ids and timestamps. */
  async bulkPut(topics: Topic[]): Promise<void> {
    await db.topics.bulkPut(topics);
  },

  async clear(): Promise<void> {
    await db.topics.clear();
  },
};
