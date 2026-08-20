import { apiClient, ApiError } from '@/services/api/axiosClient';
import type { ConcreteAiProvider } from '@/types/settings';
import { AiProviderError } from './errors';

type ChatCompletionsResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

/**
 * Low-level call to an OpenAI-compatible `/chat/completions` endpoint (Groq, OpenRouter, ...).
 * Requests JSON-object mode; unlike Google AI Studio's Structured Output, these APIs only
 * guarantee the response is valid JSON, not that it matches a specific shape — callers describe
 * the desired shape in the prompt itself (see `*_JSON_SHAPE_HINT` in the schema modules) and
 * validate the result the same way as every other provider.
 */
export async function callOpenAiCompatibleStructured(
  provider: ConcreteAiProvider,
  apiKey: string,
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<string | undefined> {
  try {
    const { data } = await apiClient.post<ChatCompletionsResponse>(
      '/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      },
      {
        baseURL: baseUrl.replace(/\/+$/, ''),
        meta: { provider, apiKey: `Bearer ${apiKey}`, apiKeyHeader: 'Authorization' },
      },
    );
    return data.choices?.[0]?.message?.content;
  } catch (error) {
    if (error instanceof ApiError) {
      throw new AiProviderError(provider, error.message, error.retryable);
    }
    throw error;
  }
}
