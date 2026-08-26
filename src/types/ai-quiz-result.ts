export type QuizMode = 'multiple-choice' | 'open-ended';

/** Per-question breakdown of one completed AI Quiz Generator attempt — kept alongside the
 *  summary fields on `AiQuizResult` so quiz history can show more than just a score. */
export interface AiQuizResultQuestionDetail {
  question: string;
  cardTitle: string;
  userAnswer: string;
  /** Multiple-choice only. */
  options?: string[];
  correctAnswer?: string;
  isCorrect?: boolean;
  /** Open-ended only — from the AI's grading pass. */
  score?: number;
  feedback?: string;
  sampleAnswer?: string;
}

/** A persisted record of one completed AI Quiz Generator attempt, kept separate from the
 *  in-session `quiz-session-store` state so the score/date/deck history survives navigation.
 *  `mode` and `questions` are optional since they postdate the original single-mode quiz feature
 *  — older records (and older exported backups) simply won't have them. */
export interface AiQuizResult {
  id: string;
  mode?: QuizMode;
  deckIds: string[];
  topicIds: string[];
  cardCount: number;
  score: number;
  total: number;
  questions?: AiQuizResultQuestionDetail[];
  createdAt: number;
}

export type NewAiQuizResult = Omit<AiQuizResult, 'id' | 'createdAt'>;
