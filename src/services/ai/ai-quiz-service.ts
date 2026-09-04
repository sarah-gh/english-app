import type { Card } from '@/types/card';
import type { AppSettings } from '@/types/settings';
import { callAihubmixStructured } from './aihubmix-client';
import { AiProviderError } from './errors';
import { callGoogleStructured } from './google-client';
import { callOpenAiCompatibleStructured } from './openai-compatible-client';
import {
  buildDescriptiveEvaluationPrompt,
  buildDescriptiveQuizPrompt,
  buildMultipleChoiceQuizPrompt,
} from './quiz-prompt-builder';
import {
  parseQuizEvaluationResponseText,
  QUIZ_EVALUATION_JSON_SHAPE_HINT,
  QUIZ_EVALUATION_RESPONSE_SCHEMA,
  type GeneratedQuizEvaluation,
} from './quiz-evaluation-schema';
import {
  DESCRIPTIVE_QUIZ_JSON_SHAPE_HINT,
  DESCRIPTIVE_QUIZ_RESPONSE_SCHEMA,
  MULTIPLE_CHOICE_QUIZ_JSON_SHAPE_HINT,
  MULTIPLE_CHOICE_QUIZ_RESPONSE_SCHEMA,
  parseDescriptiveQuizResponseText,
  parseMultipleChoiceQuizResponseText,
  type GeneratedDescriptiveQuestion,
  type GeneratedMultipleChoiceQuestion,
} from './quiz-schema';
import { withProviderFallback } from './with-provider-fallback';

export { hasRequiredAiCredentials } from './with-provider-fallback';

/** Runs one quiz-related structured request against whichever provider(s) are configured in
 *  Settings. Mirrors `generateField` in `field-autofill-service.ts`: it calls the low-level
 *  `call*Structured` primitives directly rather than routing through a per-feature wrapper in
 *  every provider client file, so adding a new quiz request shape only needs a prompt builder and
 *  a response schema/parser here. */
async function runQuizRequest<T>(
  settings: AppSettings,
  prompt: string,
  responseSchema: object,
  jsonShapeHint: string,
  parse: (text: string | undefined, makeError: (message: string) => Error) => T,
): Promise<T> {
  return withProviderFallback(settings, {
    google: async (apiKey) => {
      const text = await callGoogleStructured(apiKey, prompt, responseSchema);
      return parse(text, (message) => new AiProviderError('google', message, false));
    },
    groq: async (apiKey, baseUrl, model) => {
      const text = await callOpenAiCompatibleStructured('groq', apiKey, baseUrl, model, prompt + jsonShapeHint);
      return parse(text, (message) => new AiProviderError('groq', message, false));
    },
    openrouter: async (apiKey, baseUrl, model) => {
      const text = await callOpenAiCompatibleStructured('openrouter', apiKey, baseUrl, model, prompt + jsonShapeHint);
      return parse(text, (message) => new AiProviderError('openrouter', message, false));
    },
    aihubmix: async (apiKey, baseUrl) => {
      const text = await callAihubmixStructured(apiKey, baseUrl, prompt, responseSchema);
      return parse(text, (message) => new AiProviderError('aihubmix', message, false));
    },
  });
}

/** Generates a 4-option multiple-choice quiz grounded in the given flashcards, using the
 *  provider(s) configured in Settings — see `withProviderFallback` for the fallback semantics. */
export async function generateMultipleChoiceQuiz(
  settings: AppSettings,
  cards: Card[],
  questionCount: number,
): Promise<GeneratedMultipleChoiceQuestion[]> {
  const prompt = buildMultipleChoiceQuizPrompt(cards, questionCount, settings.proficiencyLevel);
  return runQuizRequest(
    settings,
    prompt,
    MULTIPLE_CHOICE_QUIZ_RESPONSE_SCHEMA,
    MULTIPLE_CHOICE_QUIZ_JSON_SHAPE_HINT,
    parseMultipleChoiceQuizResponseText,
  );
}

/** Generates an open-ended/descriptive quiz grounded in the given flashcards — answers are typed
 *  free-text and graded afterward by `evaluateDescriptiveQuiz`, not exact-matched. */
export async function generateDescriptiveQuiz(
  settings: AppSettings,
  cards: Card[],
  questionCount: number,
): Promise<GeneratedDescriptiveQuestion[]> {
  const prompt = buildDescriptiveQuizPrompt(cards, questionCount, settings.proficiencyLevel);
  return runQuizRequest(
    settings,
    prompt,
    DESCRIPTIVE_QUIZ_RESPONSE_SCHEMA,
    DESCRIPTIVE_QUIZ_JSON_SHAPE_HINT,
    parseDescriptiveQuizResponseText,
  );
}

export interface DescriptiveQuizAnswer {
  question: string;
  userAnswer: string;
}

/** Grades a batch of free-text answers to a descriptive quiz, returning a 0-100 score, short
 *  feedback, and a sample answer for each — indexed back to `items` via `sourceIndex`. */
export async function evaluateDescriptiveQuiz(
  settings: AppSettings,
  items: DescriptiveQuizAnswer[],
): Promise<GeneratedQuizEvaluation[]> {
  const prompt = buildDescriptiveEvaluationPrompt(items, settings.proficiencyLevel);
  return runQuizRequest(
    settings,
    prompt,
    QUIZ_EVALUATION_RESPONSE_SCHEMA,
    QUIZ_EVALUATION_JSON_SHAPE_HINT,
    parseQuizEvaluationResponseText,
  );
}
