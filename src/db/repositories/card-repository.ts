import { db } from '@/db';
import { DEFAULT_REVIEW_STATS, type Card, type CardUpdate, type NewCard, type ReviewStatus } from '@/types/card';

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

  async getByTopic(topicId: string): Promise<Card[]> {
    return byCreatedAtDesc(await db.cards.where('topicId').equals(topicId).toArray());
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
      reviewStats: { ...DEFAULT_REVIEW_STATS },
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await db.cards.add(record);
    return record;
  },

  /** Used by bulk import (e.g. Excel) — creates many cards in one transaction. */
  async createMany(newCards: NewCard[]): Promise<Card[]> {
    const timestamp = Date.now();
    const records: Card[] = newCards.map((card) => ({
      ...card,
      id: crypto.randomUUID(),
      reviewStatus: 'new',
      reviewStats: { ...DEFAULT_REVIEW_STATS },
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    await db.cards.bulkAdd(records);
    return records;
  },

  async update(id: string, changes: CardUpdate): Promise<void> {
    await db.cards.update(id, { ...changes, updatedAt: Date.now() });
  },

  async setReviewStatus(id: string, status: ReviewStatus): Promise<void> {
    await db.cards.update(id, { reviewStatus: status, updatedAt: Date.now() });
  },

  /** Records the outcome of one card's mini matching-quiz attempt: bumps `timesReviewed`,
   *  the relevant success/fail counter, and `lastReviewedAt`. */
  async recordMatchResult(id: string, success: boolean): Promise<void> {
    const card = await db.cards.get(id);
    if (!card) return;

    const stats = card.reviewStats ?? { ...DEFAULT_REVIEW_STATS };
    await db.cards.update(id, {
      reviewStats: {
        timesReviewed: stats.timesReviewed + 1,
        lastReviewedAt: Date.now(),
        successfulMatches: stats.successfulMatches + (success ? 1 : 0),
        failedMatches: stats.failedMatches + (success ? 0 : 1),
      },
      updatedAt: Date.now(),
    });
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
