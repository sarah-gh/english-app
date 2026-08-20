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

/** If the configured AIHubMix base URL can't be reached at all (a local network failure, not an
 *  HTTP error from the server), retry once against this known-good mirror before giving up. */
const PREFERRED_FALLBACK_BASE_URL = 'https://api.inferera.com';

type GenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/** Calls AIHubMix's Gemini-compatible proxy, which accepts the same request/response shape as
 *  the direct Gemini API (including Structured JSON Output) under `{baseUrl}/gemini/...`. */
async function postToAihubmix(baseUrl: string, apiKey: string, prompt: string, responseSchema: object) {
  return apiClient.post<GenerateContentResponse>(
    `/gemini/v1beta/models/${MODEL}:generateContent`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    },
    { baseURL: baseUrl, meta: { provider: 'aihubmix', apiKey } },
  );
}

/** Low-level call to AIHubMix's Structured JSON Output endpoint. Returns the raw JSON text the
 *  model produced — callers validate/parse it into their own feature-specific shape. */
export async function callAihubmixStructured(
  apiKey: string,
  baseUrl: string,
  prompt: string,
  responseSchema: object,
): Promise<string | undefined> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  let data: GenerateContentResponse;
  try {
    ({ data } = await postToAihubmix(normalizedBaseUrl, apiKey, prompt, responseSchema));
  } catch (error) {
    // `status` is only set once a response actually came back — undefined means the request
    // never reached the server (DNS/connection failure), which is when the mirror is worth a try.
    const isNetworkFailure = error instanceof ApiError && error.status === undefined;
    if (!isNetworkFailure || normalizedBaseUrl === PREFERRED_FALLBACK_BASE_URL) {
      if (error instanceof ApiError) throw new AiProviderError('aihubmix', error.message, error.retryable);
      throw error;
    }

    console.warn(
      `[aihubmix-client] Could not reach ${normalizedBaseUrl}; retrying via preferred base URL ${PREFERRED_FALLBACK_BASE_URL}.`,
    );
    try {
      ({ data } = await postToAihubmix(PREFERRED_FALLBACK_BASE_URL, apiKey, prompt, responseSchema));
    } catch (retryError) {
      if (retryError instanceof ApiError) {
        throw new AiProviderError(
          'aihubmix',
          'Could not reach AIHubMix on the configured or preferred base URL. Check your connection.',
          retryError.retryable,
        );
      }
      throw retryError;
    }
  }

  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

export async function generateQuizViaAihubmix(
  apiKey: string,
  baseUrl: string,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  const text = await callAihubmixStructured(apiKey, baseUrl, prompt, QUIZ_RESPONSE_SCHEMA);
  return parseQuizResponseText(text, (message) => new AiProviderError('aihubmix', message, false));
}

export async function autoFillCardViaAihubmix(
  apiKey: string,
  baseUrl: string,
  prompt: string,
): Promise<GeneratedCardDetails> {
  const text = await callAihubmixStructured(apiKey, baseUrl, prompt, CARD_AUTOFILL_RESPONSE_SCHEMA);
  return parseCardAutofillResponseText(text, (message) => new AiProviderError('aihubmix', message, false));
}

export async function autoFillWordFamilyViaAihubmix(
  apiKey: string,
  baseUrl: string,
  prompt: string,
): Promise<GeneratedWordFamily> {
  const text = await callAihubmixStructured(apiKey, baseUrl, prompt, WORD_FAMILY_RESPONSE_SCHEMA);
  return parseWordFamilyResponseText(text, (message) => new AiProviderError('aihubmix', message, false));
}
