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
   *  root word is "Decide" — distinct from `pos`, which is only the grammatical category. */
  wordForm?: string;
  definition: string;
  ipa?: string;
  examples?: string[];
}

export interface POSDetail {
  word: string;
  meaning?: string;
  example?: string;
}

/** A root word and its Noun/Verb/Adjective/Adverb forms (e.g. Success / Succeed / Successful /
 *  Successfully) — an alternative to the standard front/back card shape for teaching word
 *  families as a group. */
export interface WordFamilyData {
  rootWord: string;
  noun?: POSDetail;
  verb?: POSDetail;
  adjective?: POSDetail;
  adverb?: POSDetail;
  usageNotes?: string;
}

export interface Card {
  id: string;
  frontTitle: string;
  backAnswer: string;
  deckId: string;
  tagIds: string[];
  ipa?: string;
  ttsEnabled: boolean;
  audioBlob?: Blob;
  hint?: string;
  examples: string[];
  quizQuestions: QuizQuestion[];
  /** Optional — a word can have multiple parts of speech, each with its own definition/IPA/examples. */
  partsOfSpeech?: PartOfSpeechEntry[];
  /** Optional — present only for "Word Family" cards, an alternative template to the standard
   *  front/back layout. */
  wordFamily?: WordFamilyData;
  imageBlob?: Blob;
  reviewStatus: ReviewStatus;
  createdAt: number;
  updatedAt: number;
}

export type NewCard = Omit<Card, 'id' | 'reviewStatus' | 'createdAt' | 'updatedAt'>;
export type CardUpdate = Partial<Omit<Card, 'id' | 'createdAt'>>;
