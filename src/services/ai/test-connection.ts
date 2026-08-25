import { callAihubmixStructured } from './aihubmix-client';
import { AiProviderError } from './errors';
import { callGoogleStructured } from './google-client';
import { callOpenAiCompatibleStructured } from './openai-compatible-client';
import type { ConcreteAiProvider } from '@/types/settings';

const PING_PROMPT = 'Reply with JSON only: {"ok": true}';
const PING_SCHEMA = {
  type: 'object',
  properties: { ok: { type: 'boolean' } },
  required: ['ok'],
};

/** Makes a minimal real request against a provider to verify the API key/base URL/model work,
 *  without generating any user-facing content. Throws `AiProviderError` on failure. */
export async function testProviderConnection(
  provider: ConcreteAiProvider,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<void> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) throw new AiProviderError(provider, 'Enter an API key first.', false);

  if (provider === 'google') {
    await callGoogleStructured(trimmedKey, PING_PROMPT, PING_SCHEMA);
  } else if (provider === 'aihubmix') {
    await callAihubmixStructured(trimmedKey, baseUrl, PING_PROMPT, PING_SCHEMA);
  } else {
    await callOpenAiCompatibleStructured(provider, trimmedKey, baseUrl, model, PING_PROMPT);
  }
}
