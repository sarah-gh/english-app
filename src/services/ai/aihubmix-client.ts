import { AiProviderError } from './errors';
import { parseQuizResponseText, QUIZ_RESPONSE_SCHEMA, type GeneratedQuizQuestion } from './quiz-schema';

const MODEL = 'gemini-flash-latest';

/** If the configured AIHubMix base URL can't be reached at all (a local network failure, not an
 *  HTTP error from the server), retry once against this known-good mirror before giving up. */
const PREFERRED_FALLBACK_BASE_URL = 'https://api.inferera.com';

function aihubmixError(message: string, retryable: boolean): AiProviderError {
  return new AiProviderError('aihubmix', message, retryable);
}

async function fetchAihubmix(baseUrl: string, apiKey: string, prompt: string): Promise<Response> {
  const endpoint = `${baseUrl}/gemini/v1beta/models/${MODEL}:generateContent`;
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: QUIZ_RESPONSE_SCHEMA,
      },
    }),
  });
}

/** Calls AIHubMix's Gemini-compatible proxy, which accepts the same request/response shape as
 *  the direct Gemini API (including Structured JSON Output) under `{baseUrl}/gemini/...`. */
export async function generateQuizViaAihubmix(
  apiKey: string,
  baseUrl: string,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');

  let response: Response;
  try {
    response = await fetchAihubmix(normalizedBaseUrl, apiKey, prompt);
  } catch {
    if (normalizedBaseUrl === PREFERRED_FALLBACK_BASE_URL) {
      throw aihubmixError('Could not reach AIHubMix. Check your connection and base URL, and try again.', true);
    }
    console.warn(
      `[aihubmix-client] Could not reach ${normalizedBaseUrl}; retrying via preferred base URL ${PREFERRED_FALLBACK_BASE_URL}.`,
    );
    try {
      response = await fetchAihubmix(PREFERRED_FALLBACK_BASE_URL, apiKey, prompt);
    } catch {
      throw aihubmixError(
        'Could not reach AIHubMix on the configured or preferred base URL. Check your connection.',
        true,
      );
    }
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw aihubmixError('AIHubMix rejected the request — check that your API key is valid.', false);
    }
    if (response.status === 429) {
      throw aihubmixError('AIHubMix rate limit reached. Please wait a moment and try again.', true);
    }
    if (response.status >= 500) {
      throw aihubmixError(`AIHubMix API error (${response.status}). Please try again.`, true);
    }
    throw aihubmixError(`AIHubMix API error (${response.status}). Please try again.`, false);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  return parseQuizResponseText(text, (message) => aihubmixError(message, false));
}
