import { db } from '@/db';
import { DEFAULT_REVIEW_STATS, type Card, type CardUpdate, type NewCard, type ReviewStatus } from '@/types/card';

/** Newest-first — matches the default sort shown across the app's card list/browsing views. */
function byCreatedAtDesc(cards: Card[]): Card[] {
  return cards.sort((a, b) => b.createdAt - a.createdAt);
}

/** Cloud Sync needs tombstones (`isDeleted: true` rows) to replicate deletions to other devices —
 *  every other reader wants live rows only, so this filter is applied at every normal read path. */
function excludeDeleted(cards: Card[]): Card[] {
  return cards.filter((card) => !card.isDeleted);
}

export const cardRepository = {
  async getAll(): Promise<Card[]> {
    return byCreatedAtDesc(excludeDeleted(await db.cards.toArray()));
  },

  /** Used by Cloud Sync, which needs tombstones too so a deletion on one device replicates to the
   *  others instead of being invisible to the merge. */
  async getAllIncludingDeleted(): Promise<Card[]> {
    return db.cards.toArray();
  },

  async getById(id: string): Promise<Card | undefined> {
    return db.cards.get(id);
  },

  async getByDeck(deckId: string): Promise<Card[]> {
    return byCreatedAtDesc(excludeDeleted(await db.cards.where('deckId').equals(deckId).toArray()));
  },

  async getByTopic(topicId: string): Promise<Card[]> {
    return byCreatedAtDesc(excludeDeleted(await db.cards.where('topicId').equals(topicId).toArray()));
  },

  async getByTag(tagId: string): Promise<Card[]> {
    return byCreatedAtDesc(excludeDeleted(await db.cards.where('tagIds').equals(tagId).toArray()));
  },

  async getByReviewStatus(status: ReviewStatus): Promise<Card[]> {
    return byCreatedAtDesc(excludeDeleted(await db.cards.where('reviewStatus').equals(status).toArray()));
  },

  async create(card: NewCard): Promise<Card> {
    const timestamp = Date.now();
    const record: Card = {
      ...card,
      id: crypto.randomUUID(),
      reviewStatus: 'new',
      reviewStats: { ...DEFAULT_REVIEW_STATS },
      studyCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
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
      studyCount: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
      isDeleted: false,
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

  /** Bumps a card's `studyCount` by 1 — called once per card completed in a Study-mode session
   *  (see `study-session-store.ts`'s `advance`). A card needs `studyCount > 0` to be eligible for
   *  a Practice-mode session. */
  async incrementStudyCount(id: string): Promise<void> {
    const card = await db.cards.get(id);
    if (!card) return;
    await db.cards.update(id, { studyCount: card.studyCount + 1, updatedAt: Date.now() });
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

  /** Soft-deletes: marks the row `isDeleted` instead of removing it, so Cloud Sync can replicate
   *  the deletion to other devices as a change record. Permanently removed later by the
   *  garbage collector once the tombstone is 30+ days old. */
  async delete(id: string): Promise<void> {
    await db.cards.update(id, { isDeleted: true, updatedAt: Date.now() });
  },

  /** Used by backup import and Cloud Sync — writes records as-is, preserving ids and timestamps. */
  async bulkPut(cards: Card[]): Promise<void> {
    await db.cards.bulkPut(cards);
  },

  async clear(): Promise<void> {
    await db.cards.clear();
  },
};
