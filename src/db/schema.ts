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
  }
}
