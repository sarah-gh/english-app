import { db } from '@/db';
import type { NewTopic, Topic, TopicUpdate } from '@/types/topic';

export const topicRepository = {
  async getAll(): Promise<Topic[]> {
    return db.topics.orderBy('name').toArray();
  },

  async getById(id: string): Promise<Topic | undefined> {
    return db.topics.get(id);
  },

  async getByDeck(deckId: string): Promise<Topic[]> {
    return (await db.topics.where('deckId').equals(deckId).toArray()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  },

  async create(topic: NewTopic): Promise<Topic> {
    const record: Topic = {
      ...topic,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    await db.topics.add(record);
    return record;
  },

  async update(id: string, changes: TopicUpdate): Promise<void> {
    await db.topics.update(id, changes);
  },

  /** Deletes the topic and unassigns it from every card that references it — cards themselves
   *  are kept, they just fall back to being untagged-by-topic within their deck. */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.topics, db.cards, async () => {
      await db.cards.where('topicId').equals(id).modify({ topicId: undefined });
      await db.topics.delete(id);
    });
  },

  async bulkPut(topics: Topic[]): Promise<void> {
    await db.topics.bulkPut(topics);
  },

  async clear(): Promise<void> {
    await db.topics.clear();
  },
};
