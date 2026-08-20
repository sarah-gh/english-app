export type GeneratedQuestionType = 'multiple-choice' | 'fill-blank';

export interface GeneratedQuizQuestion {
  /** 1-based index into the flashcard list the prompt was built from, so the app can save the
   *  question back onto the exact card it was generated from. */
  sourceIndex: number;
  type: GeneratedQuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
}

/** Gemini Structured Output schema (also understood by AIHubMix's Gemini-compatible proxy). */
export const QUIZ_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceIndex: { type: 'INTEGER' },
          type: { type: 'STRING', enum: ['multiple-choice', 'fill-blank'] },
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctAnswer: { type: 'STRING' },
        },
        required: ['sourceIndex', 'type', 'question', 'correctAnswer'],
      },
    },
  },
  required: ['questions'],
};

function isGeneratedQuizQuestion(value: unknown): value is GeneratedQuizQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.sourceIndex === 'number' &&
    (q.type === 'multiple-choice' || q.type === 'fill-blank') &&
    typeof q.question === 'string' &&
    typeof q.correctAnswer === 'string' &&
    (q.options === undefined || Array.isArray(q.options))
  );
}

/** Parses and validates a Gemini-shaped `{ questions: [...] }` JSON response body. Throws
 *  `makeError(message)` (so callers can raise a provider-specific error type) on any failure. */
export function parseQuizResponseText(
  text: string | undefined,
  makeError: (message: string) => Error,
): GeneratedQuizQuestion[] {
  if (!text) throw makeError('The AI provider returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('The AI provider returned a response that was not valid JSON.');
  }

  const questions = (parsed as { questions?: unknown }).questions;
  if (!Array.isArray(questions)) {
    throw makeError("The AI provider's response did not include a questions list.");
  }

  const validQuestions = questions.filter(isGeneratedQuizQuestion);
  if (validQuestions.length === 0) {
    throw makeError('The AI provider did not return any usable questions. Please try again.');
  }

  return validQuestions;
}
