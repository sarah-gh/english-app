import Dexie, { type Table } from 'dexie';
import type { AiQuizResult } from '@/types/ai-quiz-result';
import { DEFAULT_REVIEW_STATS, type Card } from '@/types/card';
import type { DailyStat } from '@/types/daily-stat';
import type { Deck } from '@/types/deck';
import type { AppSettings } from '@/types/settings';
import type { Tag } from '@/types/tag';
import type { Topic } from '@/types/topic';

export class AppDatabase extends Dexie {
  cards!: Table<Card, string>;
  decks!: Table<Deck, string>;
  tags!: Table<Tag, string>;
  topics!: Table<Topic, string>;
  aiQuizResults!: Table<AiQuizResult, string>;
  dailyStats!: Table<DailyStat, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('english-app-db');

    this.version(1).stores({
      cards: 'id, deckId, reviewStatus, *tagIds, createdAt',
      decks: 'id, name, createdAt',
      tags: 'id, name',
      settings: 'id',
    });

    // v2: adds the Deck -> Topic -> Card hierarchy, per-card review-stats, AI quiz history, and
    // daily study stats (goal ring / streak). Existing decks each get a "General" topic so every
    // pre-existing card lands somewhere in the new hierarchy instead of an empty bucket, and
    // existing cards are back-filled with zeroed review-stats.
    this.version(2)
      .stores({
        cards: 'id, deckId, topicId, reviewStatus, *tagIds, createdAt',
        decks: 'id, name, createdAt',
        tags: 'id, name',
        topics: 'id, deckId, name, createdAt',
        aiQuizResults: 'id, createdAt',
        dailyStats: 'date',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const decks = await tx.table<Deck, string>('decks').toArray();
        const topicsTable = tx.table<Topic, string>('topics');
        const cardsTable = tx.table<Card, string>('cards');
        const now = Date.now();

        const generalTopicIdByDeck = new Map<string, string>();
        for (const deck of decks) {
          const topic: Topic = {
            id: crypto.randomUUID(),
            deckId: deck.id,
            name: 'General',
            createdAt: now,
          };
          await topicsTable.add(topic);
          generalTopicIdByDeck.set(deck.id, topic.id);
        }

        await cardsTable.toCollection().modify((card) => {
          card.topicId = generalTopicIdByDeck.get(card.deckId);
          if (!card.reviewStats) {
            card.reviewStats = { ...DEFAULT_REVIEW_STATS };
          }
        });
      });

    // v3: adds Synonyms/Antonyms inputs to cards; existing cards are back-filled with empty arrays.
    this.version(3)
      .stores({
        cards: 'id, deckId, topicId, reviewStatus, *tagIds, createdAt',
        decks: 'id, name, createdAt',
        tags: 'id, name',
        topics: 'id, deckId, name, createdAt',
        aiQuizResults: 'id, createdAt',
        dailyStats: 'date',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Card, string>('cards')
          .toCollection()
          .modify((card) => {
            if (!card.synonyms) card.synonyms = [];
            if (!card.antonyms) card.antonyms = [];
          });
      });

    // v4: adds `updatedAt`/`isDeleted` to Deck/Topic/Tag (Card already had `updatedAt`) so Cloud
    // Sync can resolve conflicts by recency and replicate deletions as tombstones instead of
    // silently vanishing rows a device hasn't synced yet. Kept off the index list deliberately —
    // IndexedDB can't index boolean values, so `isDeleted` is filtered with `.filter()` at read
    // time rather than `.where()`.
    this.version(4)
      .stores({
        cards: 'id, deckId, topicId, reviewStatus, *tagIds, createdAt',
        decks: 'id, name, createdAt',
        tags: 'id, name',
        topics: 'id, deckId, name, createdAt',
        aiQuizResults: 'id, createdAt',
        dailyStats: 'date',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const now = Date.now();

        await tx
          .table<Card, string>('cards')
          .toCollection()
          .modify((card) => {
            if (card.isDeleted === undefined) card.isDeleted = false;
          });
        await tx
          .table<Deck, string>('decks')
          .toCollection()
          .modify((deck) => {
            if (deck.updatedAt === undefined) deck.updatedAt = deck.createdAt ?? now;
            if (deck.isDeleted === undefined) deck.isDeleted = false;
          });
        await tx
          .table<Topic, string>('topics')
          .toCollection()
          .modify((topic) => {
            if (topic.updatedAt === undefined) topic.updatedAt = topic.createdAt ?? now;
            if (topic.isDeleted === undefined) topic.isDeleted = false;
          });
        await tx
          .table<Tag, string>('tags')
          .toCollection()
          .modify((tag) => {
            if (tag.updatedAt === undefined) tag.updatedAt = tag.createdAt ?? now;
            if (tag.isDeleted === undefined) tag.isDeleted = false;
          });
      });

    // v5: adds `updatedAt` to AiQuizResult so Cloud Sync can merge quiz history the same
    // last-write-wins way as every other synced entity (see `mergeById`).
    this.version(5)
      .stores({
        cards: 'id, deckId, topicId, reviewStatus, *tagIds, createdAt',
        decks: 'id, name, createdAt',
        tags: 'id, name',
        topics: 'id, deckId, name, createdAt',
        aiQuizResults: 'id, createdAt',
        dailyStats: 'date',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<AiQuizResult, string>('aiQuizResults')
          .toCollection()
          .modify((result) => {
            if (result.updatedAt === undefined) result.updatedAt = result.createdAt;
          });
      });

    // v6: adds `isStudied` to Card — a one-way flag set once a card has been paged through in a
    // Study-mode session, gating whether it can appear in a Practice-mode session. Existing cards
    // default to `false` (nothing "studied" them under this new tracking yet), matching how a
    // brand-new card starts.
    this.version(6)
      .stores({
        cards: 'id, deckId, topicId, reviewStatus, *tagIds, createdAt',
        decks: 'id, name, createdAt',
        tags: 'id, name',
        topics: 'id, deckId, name, createdAt',
        aiQuizResults: 'id, createdAt',
        dailyStats: 'date',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Card & { isStudied?: boolean }, string>('cards')
          .toCollection()
          .modify((card) => {
            if (card.isStudied === undefined) card.isStudied = false;
          });
      });

    // v7: replaces Card's `isStudied` boolean (added in v6, moments before this app ever shipped
    // with it) with a `studyCount` counter — incremented once per Study-mode completion instead of
    // just flipped true, so Cloud Sync can merge two devices' independent study reps with
    // `Math.max` instead of one device's count winning outright and the other's being discarded
    // (see `mergeCards`). `isStudied: true` becomes `studyCount: 1` — "has been studied" with no
    // way to know how many times under the old tracking, so 1 is the honest floor.
    this.version(7)
      .stores({
        cards: 'id, deckId, topicId, reviewStatus, *tagIds, createdAt',
        decks: 'id, name, createdAt',
        tags: 'id, name',
        topics: 'id, deckId, name, createdAt',
        aiQuizResults: 'id, createdAt',
        dailyStats: 'date',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Card & { isStudied?: boolean }, string>('cards')
          .toCollection()
          .modify((card) => {
            if (card.studyCount === undefined) card.studyCount = card.isStudied ? 1 : 0;
            delete card.isStudied;
          });
      });

    // v8: every deck now always has a "General" topic, and new cards fall back to it instead of
    // being left without a topic. Decks created (or topics deleted) before that existed could
    // still have cards with no `topicId`, or a `topicId` pointing at a topic that no longer exists
    // — this backfills both: every deck gets a "General" topic (reusing a same-named one instead
    // of creating a duplicate), and every such orphaned card is reassigned to its deck's.
    this.version(8)
      .stores({
        cards: 'id, deckId, topicId, reviewStatus, *tagIds, createdAt',
        decks: 'id, name, createdAt',
        tags: 'id, name',
        topics: 'id, deckId, name, createdAt',
        aiQuizResults: 'id, createdAt',
        dailyStats: 'date',
        settings: 'id',
      })
      .upgrade(async (tx) => {
        const now = Date.now();
        const decksTable = tx.table<Deck, string>('decks');
        const topicsTable = tx.table<Topic, string>('topics');
        const cardsTable = tx.table<Card, string>('cards');

        const decks = await decksTable.toArray();
        const topics = await topicsTable.toArray();
        const validTopicIds = new Set(topics.filter((topic) => !topic.isDeleted).map((topic) => topic.id));

        const generalTopicIdByDeck = new Map<string, string>();
        for (const topic of topics) {
          if (
            !topic.isDeleted &&
            topic.name.trim().toLowerCase() === 'general' &&
            !generalTopicIdByDeck.has(topic.deckId)
          ) {
            generalTopicIdByDeck.set(topic.deckId, topic.id);
          }
        }

        for (const deck of decks) {
          if (deck.isDeleted || generalTopicIdByDeck.has(deck.id)) continue;
          const topic: Topic = {
            id: crypto.randomUUID(),
            deckId: deck.id,
            name: 'General',
            createdAt: now,
            updatedAt: now,
            isDeleted: false,
          };
          await topicsTable.add(topic);
          generalTopicIdByDeck.set(deck.id, topic.id);
        }

        await cardsTable.toCollection().modify((card) => {
          if (card.topicId && validTopicIds.has(card.topicId)) return;
          const generalId = generalTopicIdByDeck.get(card.deckId);
          if (generalId) {
            card.topicId = generalId;
            card.updatedAt = now;
          }
        });
      });
  }
}
