import { apiClient, ApiError } from '@/services/api/axiosClient';
import {
  CARD_AUTOFILL_RESPONSE_SCHEMA,
  parseCardAutofillResponseText,
  type GeneratedCardDetails,
} from './card-autofill-schema';
import { AiProviderError } from './errors';

const MODEL = 'gemini-flash-latest';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

type GenerateContentResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

/** Low-level call to Google AI Studio's Gemini Structured JSON Output endpoint. Returns the raw
 *  JSON text the model produced, callers validate/parse it into their own feature-specific
 *  shape. */
export async function callGoogleStructured(
  apiKey: string,
  prompt: string,
  responseSchema: object,
  temperature?: number,
): Promise<string | undefined> {
  try {
    const { data } = await apiClient.post<GenerateContentResponse>(
      `/models/${MODEL}:generateContent`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema,
          ...(temperature !== undefined && { temperature }),
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

/** One prior conversation turn in Gemini's own vocabulary, which calls the assistant `model`. */
export interface GeminiChatTurn {
  role: 'user' | 'model';
  text: string;
}

/** Multi-turn, free-text Gemini `generateContent` call, shared by Google AI Studio and AIHubMix's
 *  Gemini-compatible proxy (same request/response shape, different base URL/path/provider). The
 *  system prompt goes in `systemInstruction` rather than as a fake first turn. */
export async function callGeminiChat(
  target: { provider: 'google' | 'aihubmix'; apiKey: string; baseURL: string; path: string },
  systemInstruction: string,
  turns: GeminiChatTurn[],
  temperature?: number,
): Promise<string | undefined> {
  try {
    const { data } = await apiClient.post<GenerateContentResponse>(
      target.path,
      {
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        ...(temperature !== undefined && { generationConfig: { temperature } }),
      },
      { baseURL: target.baseURL, meta: { provider: target.provider, apiKey: target.apiKey } },
    );
    return data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AiProviderError(target.provider, error.message, error.retryable);
    }
    throw error;
  }
}

export function callGoogleChat(
  apiKey: string,
  systemInstruction: string,
  turns: GeminiChatTurn[],
  temperature?: number,
): Promise<string | undefined> {
  return callGeminiChat(
    { provider: 'google', apiKey, baseURL: BASE_URL, path: `/models/${MODEL}:generateContent` },
    systemInstruction,
    turns,
    temperature,
  );
}

export async function autoFillCardViaGoogle(
  apiKey: string,
  prompt: string,
): Promise<GeneratedCardDetails> {
  const text = await callGoogleStructured(apiKey, prompt, CARD_AUTOFILL_RESPONSE_SCHEMA);
  return parseCardAutofillResponseText(
    text,
    (message) => new AiProviderError('google', message, false),
  );
}
