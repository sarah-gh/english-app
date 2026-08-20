import { AiProviderError } from './errors';
import { CARD_AUTOFILL_JSON_SHAPE_HINT, parseCardAutofillResponseText, type GeneratedCardDetails } from './card-autofill-schema';
import { callOpenAiCompatibleStructured } from './openai-compatible-client';
import { parseQuizResponseText, QUIZ_JSON_SHAPE_HINT, type GeneratedQuizQuestion } from './quiz-schema';
import { parseWordFamilyResponseText, WORD_FAMILY_JSON_SHAPE_HINT, type GeneratedWordFamily } from './word-family-schema';

export async function generateQuizViaOpenrouter(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  const text = await callOpenAiCompatibleStructured(
    'openrouter',
    apiKey,
    baseUrl,
    model,
    prompt + QUIZ_JSON_SHAPE_HINT,
  );
  return parseQuizResponseText(text, (message) => new AiProviderError('openrouter', message, false));
}

export async function autoFillCardViaOpenrouter(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<GeneratedCardDetails> {
  const text = await callOpenAiCompatibleStructured(
    'openrouter',
    apiKey,
    baseUrl,
    model,
    prompt + CARD_AUTOFILL_JSON_SHAPE_HINT,
  );
  return parseCardAutofillResponseText(text, (message) => new AiProviderError('openrouter', message, false));
}

export async function autoFillWordFamilyViaOpenrouter(
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<GeneratedWordFamily> {
  const text = await callOpenAiCompatibleStructured(
    'openrouter',
    apiKey,
    baseUrl,
    model,
    prompt + WORD_FAMILY_JSON_SHAPE_HINT,
  );
  return parseWordFamilyResponseText(text, (message) => new AiProviderError('openrouter', message, false));
}
