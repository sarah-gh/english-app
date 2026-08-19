import { db } from '@/db';
import type { Deck, DeckUpdate, NewDeck } from '@/types/deck';

export const deckRepository = {
  async getAll(): Promise<Deck[]> {
    return db.decks.orderBy('name').toArray();
  },

  async getById(id: string): Promise<Deck | undefined> {
    return db.decks.get(id);
  },

  async create(deck: NewDeck): Promise<Deck> {
    const record: Deck = {
      ...deck,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    await db.decks.add(record);
    return record;
  },

  async update(id: string, changes: DeckUpdate): Promise<void> {
    await db.decks.update(id, changes);
  },

  /** Deletes the deck and cascades to every card assigned to it. */
  async delete(id: string): Promise<void> {
    await db.transaction('rw', db.decks, db.cards, async () => {
      await db.cards.where('deckId').equals(id).delete();
      await db.decks.delete(id);
    });
  },

  async bulkPut(decks: Deck[]): Promise<void> {
    await db.decks.bulkPut(decks);
  },

  async clear(): Promise<void> {
    await db.decks.clear();
  },
};
