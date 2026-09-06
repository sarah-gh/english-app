import { db } from '@/db';
import { tombstonedTable } from '@/db/repositories/tombstoned-table';
import type { Deck, DeckUpdate, NewDeck } from '@/types/deck';

/** See `tombstoned-table.ts` — one shared implementation of the "deleted rows stay, and only
 *  Cloud Sync sees them" rule, in place of a per-repository `excludeDeleted` copy. */
const tombstones = tombstonedTable(db.decks);

export const deckRepository = {
  /** `orderBy('name')` reads through the Dexie index rather than sorting in JS — the tombstone
   *  filter is applied to the rows that come back, leaving the query plan untouched. */
  async getAll(): Promise<Deck[]> {
    return tombstones.live(await db.decks.orderBy('name').toArray());
  },

  getAllIncludingDeleted: tombstones.getAllIncludingDeleted,

  getById: tombstones.getById,

  async create(deck: NewDeck): Promise<Deck> {
    const timestamp = Date.now();
    const record: Deck = {
      ...deck,
      id: crypto.randomUUID(),
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
    };
    await db.decks.add(record);
    return record;
  },

  async update(id: string, changes: DeckUpdate): Promise<void> {
    await db.decks.update(id, { ...changes, updatedAt: Date.now() });
  },

  /** Soft-deletes the deck and cascades the same tombstone to every card and topic assigned to
   *  it, so Cloud Sync replicates the whole deletion — not just the deck row — to other devices. */
  async delete(id: string): Promise<void> {
    const timestamp = Date.now();
    await db.transaction('rw', db.decks, db.cards, db.topics, async () => {
      await db.cards.where('deckId').equals(id).modify({ isDeleted: true, updatedAt: timestamp });
      await db.topics.where('deckId').equals(id).modify({ isDeleted: true, updatedAt: timestamp });
      await db.decks.update(id, { isDeleted: true, updatedAt: timestamp });
    });
  },

  /** Used by backup import and Cloud Sync — writes records as-is, preserving ids and timestamps. */
  async bulkPut(decks: Deck[]): Promise<void> {
    await db.decks.bulkPut(decks);
  },

  async clear(): Promise<void> {
    await db.decks.clear();
  },
};
