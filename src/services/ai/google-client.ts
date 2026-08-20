import { apiClient, ApiError } from '@/services/api/axiosClient';
import {
  CARD_AUTOFILL_RESPONSE_SCHEMA,
  parseCardAutofillResponseText,
  type GeneratedCardDetails,
} from './card-autofill-schema';
import { AiProviderError } from './errors';
import { parseQuizResponseText, QUIZ_RESPONSE_SCHEMA, type GeneratedQuizQuestion } from './quiz-schema';
import { parseWordFamilyResponseText, WORD_FAMILY_RESPONSE_SCHEMA, type GeneratedWordFamily } from './word-family-schema';

const MODEL = 'gemini-flash-latest';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

type GenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/** Low-level call to Google AI Studio's Gemini Structured JSON Output endpoint. Returns the raw
 *  JSON text the model produced — callers validate/parse it into their own feature-specific
 *  shape. */
export async function callGoogleStructured(
  apiKey: string,
  prompt: string,
  responseSchema: object,
): Promise<string | undefined> {
  try {
    const { data } = await apiClient.post<GenerateContentResponse>(
      `/models/${MODEL}:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      },
      { baseURL: BASE_URL, meta: { provider: 'google', apiKey } },
    );
    return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AiProviderError('google', error.message, error.retryable);
    }
    throw error;
  }
}

/** Calls Gemini Flash (via Google AI Studio) with Structured JSON Output mode enabled, using the
 *  user's own API key. */
export async function generateQuizViaGoogle(
  apiKey: string,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  const text = await callGoogleStructured(apiKey, prompt, QUIZ_RESPONSE_SCHEMA);
  return parseQuizResponseText(text, (message) => new AiProviderError('google', message, false));
}

export async function autoFillCardViaGoogle(
  apiKey: string,
  prompt: string,
): Promise<GeneratedCardDetails> {
  const text = await callGoogleStructured(apiKey, prompt, CARD_AUTOFILL_RESPONSE_SCHEMA);
  return parseCardAutofillResponseText(text, (message) => new AiProviderError('google', message, false));
}

export async function autoFillWordFamilyViaGoogle(
  apiKey: string,
  prompt: string,
): Promise<GeneratedWordFamily> {
  const text = await callGoogleStructured(apiKey, prompt, WORD_FAMILY_RESPONSE_SCHEMA);
  return parseWordFamilyResponseText(text, (message) => new AiProviderError('google', message, false));
}
