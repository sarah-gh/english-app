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
  definition: string;
  ipa?: string;
  examples?: string[];
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
  imageBlob?: Blob;
  reviewStatus: ReviewStatus;
  createdAt: number;
  updatedAt: number;
}

export type NewCard = Omit<Card, 'id' | 'reviewStatus' | 'createdAt' | 'updatedAt'>;
export type CardUpdate = Partial<Omit<Card, 'id' | 'createdAt'>>;
