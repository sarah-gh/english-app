import { db } from '@/db';
import type { Card, CardUpdate, NewCard, ReviewStatus } from '@/types/card';

/** Newest-first — matches the default sort shown across the app's card list/browsing views. */
function byCreatedAtDesc(cards: Card[]): Card[] {
  return cards.sort((a, b) => b.createdAt - a.createdAt);
}

export const cardRepository = {
  async getAll(): Promise<Card[]> {
    return byCreatedAtDesc(await db.cards.toArray());
  },

  async getById(id: string): Promise<Card | undefined> {
    return db.cards.get(id);
  },

  async getByDeck(deckId: string): Promise<Card[]> {
    return byCreatedAtDesc(await db.cards.where('deckId').equals(deckId).toArray());
  },

  async getByTag(tagId: string): Promise<Card[]> {
    return byCreatedAtDesc(await db.cards.where('tagIds').equals(tagId).toArray());
  },

  async getByReviewStatus(status: ReviewStatus): Promise<Card[]> {
    return byCreatedAtDesc(await db.cards.where('reviewStatus').equals(status).toArray());
  },

  async create(card: NewCard): Promise<Card> {
    const timestamp = Date.now();
    const record: Card = {
      ...card,
      id: crypto.randomUUID(),
      reviewStatus: 'new',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.cards.add(record);
    return record;
  },

  async update(id: string, changes: CardUpdate): Promise<void> {
    await db.cards.update(id, { ...changes, updatedAt: Date.now() });
  },

  async setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
    await db.cards.update(id, { reviewStatus: status, updatedAt: Date.now() });
  },

  async delete(id: string): Promise<void> {
    await db.cards.delete(id);
  },

  /** Used by backup import — writes records as-is, preserving ids and timestamps. */
  async bulkPut(cards: Card[]): Promise<void> {
    await db.cards.bulkPut(cards);
  },

  async clear(): Promise<void> {
    await db.cards.clear();
  },
};
