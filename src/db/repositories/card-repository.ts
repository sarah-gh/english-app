import { db } from '@/db';
import { tombstonedTable } from '@/db/repositories/tombstoned-table';
import {
  DEFAULT_REVIEW_STATS,
  type Card,
  type CardUpdate,
  type NewCard,
  type ReviewStatus,
} from '@/types/card';
import { generateUUID } from '@/utils/uuid';

/** Cloud Sync needs tombstones (`isDeleted: true` rows) to replicate deletions to other devices,
 *  every other reader wants live rows only. `tombstones.live` is the one filter every normal read
 *  path here goes through; see `tombstoned-table.ts` for why it isn't a local helper any more. */
const tombstones = tombstonedTable(db.cards);

/** Newest-first, matches the default sort shown across the app's card list/browsing views. */
function byCreatedAtDesc(cards: Card[]): Card[] {
  return cards.sort((a, b) => b.createdAt - a.createdAt);
}

export const cardRepository = {
  async getAll(): Promise<Card[]> {
    return byCreatedAtDesc(tombstones.live(await db.cards.toArray()));
  },

  getAllIncludingDeleted: tombstones.getAllIncludingDeleted,

  getById: tombstones.getById,

  async getByDeck(deckId: string): Promise<Card[]> {
    return byCreatedAtDesc(
      tombstones.live(await db.cards.where('deckId').equals(deckId).toArray()),
    );
  },

  async getByTopic(topicId: string): Promise<Card[]> {
    return byCreatedAtDesc(
      tombstones.live(await db.cards.where('topicId').equals(topicId).toArray()),
    );
  },

  async getByTag(tagId: string): Promise<Card[]> {
    return byCreatedAtDesc(tombstones.live(await db.cards.where('tagIds').equals(tagId).toArray()));
  },

  async getByReviewStatus(status: ReviewStatus): Promise<Card[]> {
    return byCreatedAtDesc(
      tombstones.live(await db.cards.where('reviewStatus').equals(status).toArray()),
    );
  },

  async create(card: NewCard): Promise<Card> {
    const timestamp = Date.now();
    const record: Card = {
      ...card,
      id: generateUUID(),
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

  /** Used by bulk import (e.g. Excel), creates many cards in one transaction. */
  async createMany(newCards: NewCard[]): Promise<Card[]> {
    const timestamp = Date.now();
    const records: Card[] = newCards.map((card) => ({
      ...card,
      id: generateUUID(),
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

  /** Bumps a card's `studyCount` by 1, called once per card completed in a Study-mode session
   *  (see `study-session-store.ts`'s `advance`). A card needs `studyCount > 0` to be eligible for
   *  a Practice-mode session. */
  async incrementStudyCount(id: string): Promise<void> {
    const card = await db.cards.get(id);
    if (!card) return;
    await db.cards.update(id, { studyCount: card.studyCount + 1, updatedAt: Date.now() });
  },

  /** Rolls back exactly one `incrementStudyCount`, used when the learner steps back onto a card
   *  they just paged past in a Study-mode session (see `study-session-store.ts`'s `goToPrevious`).
   *  Floored at 0 so a rollback can never drive the count negative and make an already-studied
   *  card look untouched, which would also drop it out of Practice mode's candidate pool. */
  async decrementStudyCount(id: string): Promise<void> {
    const card = await db.cards.get(id);
    if (!card) return;
    await db.cards.update(id, {
      studyCount: Math.max(0, card.studyCount - 1),
      updatedAt: Date.now(),
    });
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

  /** Soft-deletes, see `tombstonedTable`'s `softDelete`. Wrapped rather than aliased so the
   *  helper's optional `timestamp` argument stays out of this repository's public signature. */
  async delete(id: string): Promise<void> {
    await tombstones.softDelete(id);
  },

  /** Used by backup import and Cloud Sync, writes records as-is, preserving ids and timestamps. */
  async bulkPut(cards: Card[]): Promise<void> {
    await db.cards.bulkPut(cards);
  },

  async clear(): Promise<void> {
    await db.cards.clear();
  },
};
