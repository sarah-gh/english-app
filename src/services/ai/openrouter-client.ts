import { AiProviderError } from './errors';
import { CARD_AUTOFILL_JSON_SHAPE_HINT, parseCardAutofillResponseText, type GeneratedCardDetails } from './card-autofill-schema';
import { callOpenAiCompatibleStructured } from './openai-compatible-client';

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
