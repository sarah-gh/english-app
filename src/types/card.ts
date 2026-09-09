export type ReviewStatus = 'new' | 'easy' | 'medium' | 'hard';

export interface QuizQuestion {
  id: string;
  question: string;
  options?: string[];
  correctAnswer: string;
}

export type PosType = 'noun' | 'verb' | 'adjective' | 'adverb' | 'other';

export interface PartOfSpeechEntry {
  id: string;
  pos: PosType;
  /** The specific spelling/inflection for this part of speech, e.g. "Decision" when the card's
   *  root word is "Decide", distinct from `pos`, which is only the grammatical category. */
  wordForm?: string;
  definition: string;
  ipa?: string;
  examples?: string[];
}

export interface CardReviewStats {
  timesReviewed: number;
  lastReviewedAt?: number;
  successfulMatches: number;
  failedMatches: number;
}

export const DEFAULT_REVIEW_STATS: CardReviewStats = {
  timesReviewed: 0,
  successfulMatches: 0,
  failedMatches: 0,
};

export interface Card {
  id: string;
  frontTitle: string;
  /** Rich text HTML (a restricted tag set, see `sanitizeRichText` in `@/utils/html`), produced by
   *  the card editor's rich text field or AI Auto-Fill. Rendered with `v-html` wherever it's shown
   *  formatted, and passed through `stripHtmlToText` wherever only plain text is usable (search,
   *  list previews, the matching-quiz game). */
  backAnswer: string;
  /** Optional, extended context that doesn't belong on the concise back-of-card answer: verb
   *  forms/tenses, phrasal verbs, collocations, idiom origins, and similar supplementary notes.
   *  Same restricted rich-text HTML tag set as `backAnswer` (see `sanitizeRichText`), shown in its
   *  own expandable "Extra Information" section during review instead of cluttering the answer. */
  extraInfo?: string;
  deckId: string;
  /** Optional, cards created before Topics existed (or never sorted) have no topic. */
  topicId?: string;
  tagIds: string[];
  ipa?: string;
  ttsEnabled: boolean;
  audioBlob?: Blob;
  hint?: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  quizQuestions: QuizQuestion[];
  /** Optional, a word can have multiple parts of speech, each with its own definition/IPA/examples. */
  partsOfSpeech?: PartOfSpeechEntry[];
  imageBlob?: Blob;
  reviewStatus: ReviewStatus;
  reviewStats: CardReviewStats;
  /** Incremented by 1 each time a card is completed in a Study-mode session (see
   *  `study-session-store.ts`'s `advance`), never decremented. Practice-mode sessions filter
   *  their candidate pool to `studyCount > 0`, so a card has to be studied at least once before it
   *  can be tested on. Merged across devices with `Math.max`, not last-write-wins (see
   *  `mergeCards`), so a device's study reps are never silently discarded by a sync. */
  studyCount: number;
  createdAt: number;
  updatedAt: number;
  /** Soft-delete flag, set instead of removing the row outright, so a deletion on one device can
   *  be replicated to another as a change record during cloud sync rather than being invisible to
   *  it. Garbage-collected locally 30 days after `updatedAt`. */
  isDeleted: boolean;
}

export type NewCard = Omit<
  Card,
  'id' | 'reviewStatus' | 'reviewStats' | 'studyCount' | 'createdAt' | 'updatedAt' | 'isDeleted'
>;
export type CardUpdate = Partial<Omit<Card, 'id' | 'createdAt'>>;
