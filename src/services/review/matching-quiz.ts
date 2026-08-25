import type { Card } from '@/types/card';
import { shuffle } from '@/utils/shuffle';

export interface MatchWordItem {
  cardId: string;
  word: string;
}

export interface MatchMeaningItem {
  cardId: string;
  meaning: string;
}

export interface MatchingQuizChunk {
  words: MatchWordItem[];
  meanings: MatchMeaningItem[];
}

/** Builds the 2-column matching quiz for one chunk of studied cards — words and meanings are
 *  shuffled independently so neither column's order gives away the pairing. */
export function buildMatchingQuizChunk(cards: Card[]): MatchingQuizChunk {
  return {
    words: shuffle(cards.map((card) => ({ cardId: card.id, word: card.frontTitle }))),
    meanings: shuffle(cards.map((card) => ({ cardId: card.id, meaning: card.backAnswer }))),
  };
}
