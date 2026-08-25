/** A persisted record of one completed AI Quiz Generator attempt, kept separate from the
 *  in-session `quiz-session-store` state so the score/date/deck history survives navigation. */
export interface AiQuizResult {
  id: string;
  deckIds: string[];
  topicIds: string[];
  cardCount: number;
  score: number;
  total: number;
  createdAt: number;
}

export type NewAiQuizResult = Omit<AiQuizResult, 'id' | 'createdAt'>;
