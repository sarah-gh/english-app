import { db } from '@/db';
import type { NewTag, Tag, TagUpdate } from '@/types/tag';

function excludeDeleted(tags: Tag[]): Tag[] {
  return tags.filter((tag) => !tag.isDeleted);
}

export const tagRepository = {
  async getAll(): Promise<Tag[]> {
    return excludeDeleted(await db.tags.orderBy('name').toArray());
  },

  /** Used by Cloud Sync, which needs tombstones too so a deletion on one device replicates to the
   *  others instead of being invisible to the merge. */
  async getAllIncludingDeleted(): Promise<Tag[]> {
    return db.tags.toArray();
  },

  async getById(id: string): Promise<Tag | undefined> {
    return db.tags.get(id);
  },

  async create(tag: NewTag): Promise<Tag> {
    const timestamp = Date.now();
    const record: Tag = {
      ...tag,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await db.tags.add(record);
    return record;
  },

  async update(id: string, changes: TagUpdate): Promise<void> {
    await db.tags.update(id, { ...changes, updatedAt: Date.now() });
  },

  /** Soft-deletes the tag and removes its id from every card that references it. Both the tag's
   *  tombstone and the cards' pruned `tagIds` are timestamped so Cloud Sync replicates them. */
  async delete(id: string): Promise<void> {
    const timestamp = Date.now();
    await db.transaction('rw', db.tags, db.cards, async () => {
      const taggedCards = await db.cards.where('tagIds').equals(id).toArray();
      await Promise.all(
        taggedCards.map((card) =>
          db.cards.update(card.id, {
            tagIds: card.tagIds.filter((tagId) => tagId !== id),
            updatedAt: timestamp,
          }),
        ),
      );
      await db.tags.update(id, { isDeleted: true, updatedAt: timestamp });
    });
  },

  /** Used by backup import and Cloud Sync — writes records as-is, preserving ids and timestamps. */
  async bulkPut(tags: Tag[]): Promise<void> {
    await db.tags.bulkPut(tags);
  },

  async clear(): Promise<void> {
    await db.tags.clear();
  },
};
