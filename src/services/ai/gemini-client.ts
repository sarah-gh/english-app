import { AiProviderError } from './errors';
import { parseQuizResponseText, QUIZ_RESPONSE_SCHEMA, type GeneratedQuizQuestion } from './quiz-schema';

const MODEL = 'gemini-flash-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function geminiError(message: string, retryable: boolean): AiProviderError {
  return new AiProviderError('gemini', message, retryable);
}

/** Calls Gemini Flash with Structured JSON Output mode enabled, using the user's own API key. */
export async function generateQuizViaGemini(
  apiKey: string,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
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
  } catch {
    throw geminiError('Could not reach the Gemini API. Check your connection and try again.', true);
  }

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw geminiError('Gemini rejected the request — check that your API key is valid.', false);
    }
    if (response.status === 429) {
      throw geminiError('Gemini rate limit reached. Please wait a moment and try again.', true);
    }
    if (response.status >= 500) {
      throw geminiError(`Gemini API error (${response.status}). Please try again.`, true);
    }
    throw geminiError(`Gemini API error (${response.status}). Please try again.`, false);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  return parseQuizResponseText(text, (message) => geminiError(message, false));
}
