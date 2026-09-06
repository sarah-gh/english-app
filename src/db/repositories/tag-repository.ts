import { db } from '@/db';
import { tombstonedTable } from '@/db/repositories/tombstoned-table';
import type { NewTag, Tag, TagUpdate } from '@/types/tag';

/** See `tombstoned-table.ts`, one shared implementation of the "deleted rows stay, and only
 *  Cloud Sync sees them" rule, in place of a per-repository `excludeDeleted` copy. */
const tombstones = tombstonedTable(db.tags);

export const tagRepository = {
  /** `orderBy('name')` reads through the Dexie index rather than sorting in JS, the tombstone
   *  filter is applied to the rows that come back, leaving the query plan untouched. */
  async getAll(): Promise<Tag[]> {
    return tombstones.live(await db.tags.orderBy('name').toArray());
  },

  getAllIncludingDeleted: tombstones.getAllIncludingDeleted,

  getById: tombstones.getById,

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

  /** Used by backup import and Cloud Sync, writes records as-is, preserving ids and timestamps. */
  async bulkPut(tags: Tag[]): Promise<void> {
    await db.tags.bulkPut(tags);
  },

  async clear(): Promise<void> {
    await db.tags.clear();
  },
};
