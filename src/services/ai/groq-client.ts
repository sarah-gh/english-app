import { AiProviderError } from './errors';
import { CARD_AUTOFILL_JSON_SHAPE_HINT, parseCardAutofillResponseText, type GeneratedCardDetails } from './card-autofill-schema';
import { callOpenAiCompatibleStructured } from './openai-compatible-client';
import { parseQuizResponseText, QUIZ_JSON_SHAPE_HINT, type GeneratedQuizQuestion } from './quiz-schema';
import { parseWordFamilyResponseText, WORD_FAMILY_JSON_SHAPE_HINT, type GeneratedWordFamily } from './word-family-schema';

export async function generateQuizViaGroq(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  const text = await callOpenAiCompatibleStructured(
    'groq',
    apiKey,
    baseUrl,
    model,
    prompt + QUIZ_JSON_SHAPE_HINT,
  );
  return parseQuizResponseText(text, (message) => new AiProviderError('groq', message, false));
}

export async function autoFillCardViaGroq(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<GeneratedCardDetails> {
  const text = await callOpenAiCompatibleStructured(
    'groq',
    apiKey,
    baseUrl,
    model,
    prompt + CARD_AUTOFILL_JSON_SHAPE_HINT,
  );
  return parseCardAutofillResponseText(text, (message) => new AiProviderError('groq', message, false));
}

export async function autoFillWordFamilyViaGroq(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<GeneratedWordFamily> {
  const text = await callOpenAiCompatibleStructured(
    'groq',
    apiKey,
    baseUrl,
    model,
    prompt + WORD_FAMILY_JSON_SHAPE_HINT,
  );
  return parseWordFamilyResponseText(text, (message) => new AiProviderError('groq', message, false));
}
