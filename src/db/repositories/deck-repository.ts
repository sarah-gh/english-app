import { db } from '@/db';
import type { Deck, DeckUpdate, NewDeck } from '@/types/deck';

function excludeDeleted(decks: Deck[]): Deck[] {
  return decks.filter((deck) => !deck.isDeleted);
}

export const deckRepository = {
  async getAll(): Promise<Deck[]> {
    return excludeDeleted(await db.decks.orderBy('name').toArray());
  },

  /** Used by Cloud Sync, which needs tombstones too so a deletion on one device replicates to the
   *  others instead of being invisible to the merge. */
  async getAllIncludingDeleted(): Promise<Deck[]> {
    return db.decks.toArray();
  },

  async getById(id: string): Promise<Deck | undefined> {
    return db.decks.get(id);
  },

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
