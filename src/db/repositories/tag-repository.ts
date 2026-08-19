import { db } from '@/db';
import type { NewTag, Tag, TagUpdate } from '@/types/tag';

export const tagRepository = {
  async getAll(): Promise<Tag[]> {
    return db.tags.orderBy('name').toArray();
  },

  async getById(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  async create(tag: NewTag): Promise<Tag> {
    const record: Tag = {
      ...tag,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    await db.tags.add(record);
    return record;
  },

  async update(id: string, changes: TagUpdate): Promise<void> {
    await db.tags.update(id, changes);
  },

  /** Deletes the tag and removes its id from every card that references it. */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.tags, db.cards, async () => {
      const taggedCards = await db.cards.where('tagIds').equals(id).toArray();
      await Promise.all(
        taggedCards.map((card) =>
          db.cards.update(card.id, {
            tagIds: card.tagIds.filter((tagId) => tagId !== id),
          }),
        ),
      );
      await db.tags.delete(id);
    });
  },

  async bulkPut(tags: Tag[]): Promise<void> {
    await db.tags.bulkPut(tags);
  },

  async clear(): Promise<void> {
    await db.tags.clear();
  },
};
