export interface GeneratedMultipleChoiceQuestion {
  /** 1-based index into the flashcard list the prompt was built from, so the app can save the
   *  question back onto the exact card it should be associated with. */
  sourceIndex: number;
  question: string;
  /** Exactly 4 plausible options. */
  options: string[];
  /** 0-based index into `options` identifying the correct answer. */
  correctOptionIndex: number;
}

/** Gemini Structured Output schema (also understood by AIHubMix's Gemini-compatible proxy). */
export const MULTIPLE_CHOICE_QUIZ_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceIndex: { type: 'INTEGER' },
          question: { type: 'STRING' },
          options: { type: 'ARRAY', items: { type: 'STRING' } },
          correctOptionIndex: { type: 'INTEGER' },
        },
        required: ['sourceIndex', 'question', 'options', 'correctOptionIndex'],
      },
    },
  },
  required: ['questions'],
};

/** OpenAI-compatible chat APIs (Groq, OpenRouter) don't support Gemini-style JSON Schema
 *  enforcement — their JSON mode only guarantees valid JSON, not a specific shape — so this gets
 *  appended to the prompt itself to describe the shape in words. */
export const MULTIPLE_CHOICE_QUIZ_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"questions": [{"sourceIndex": number, "question": string, "options": string[] (exactly 4 entries), "correctOptionIndex": number (0-based index into "options")}]}`;

function isGeneratedMultipleChoiceQuestion(value: unknown): value is GeneratedMultipleChoiceQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return (
    typeof q.sourceIndex === 'number' &&
    typeof q.question === 'string' &&
    Array.isArray(q.options) &&
    q.options.length === 4 &&
    q.options.every((option) => typeof option === 'string') &&
    typeof q.correctOptionIndex === 'number' &&
    q.correctOptionIndex >= 0 &&
    q.correctOptionIndex < q.options.length
  );
}

/** Parses and validates a Gemini-shaped `{ questions: [...] }` JSON response body. Throws
 *  `makeError(message)` (so callers can raise a provider-specific error type) on any failure. */
export function parseMultipleChoiceQuizResponseText(
  text: string | undefined,
  makeError: (message: string) => Error,
): GeneratedMultipleChoiceQuestion[] {
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

  const validQuestions = questions.filter(isGeneratedMultipleChoiceQuestion);
  if (validQuestions.length === 0) {
    throw makeError('The AI provider did not return any usable questions. Please try again.');
  }

  return validQuestions;
}

export interface GeneratedDescriptiveQuestion {
  /** 1-based index into the flashcard list the prompt was built from. */
  sourceIndex: number;
  question: string;
}

export const DESCRIPTIVE_QUIZ_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sourceIndex: { type: 'INTEGER' },
          question: { type: 'STRING' },
        },
        required: ['sourceIndex', 'question'],
      },
    },
  },
  required: ['questions'],
};

export const DESCRIPTIVE_QUIZ_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"questions": [{"sourceIndex": number, "question": string}]}`;

function isGeneratedDescriptiveQuestion(value: unknown): value is GeneratedDescriptiveQuestion {
  if (!value || typeof value !== 'object') return false;
  const q = value as Record<string, unknown>;
  return typeof q.sourceIndex === 'number' && typeof q.question === 'string' && q.question.trim().length > 0;
}

/** Parses and validates a Gemini-shaped `{ questions: [...] }` JSON response body. Throws
 *  `makeError(message)` (so callers can raise a provider-specific error type) on any failure. */
export function parseDescriptiveQuizResponseText(
  text: string | undefined,
  makeError: (message: string) => Error,
): GeneratedDescriptiveQuestion[] {
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

  const validQuestions = questions.filter(isGeneratedDescriptiveQuestion);
  if (validQuestions.length === 0) {
    throw makeError('The AI provider did not return any usable questions. Please try again.');
  }

  return validQuestions;
}
