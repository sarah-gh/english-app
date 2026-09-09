import type { AppSettings } from '@/types/settings';
import { autoFillCardViaAihubmix } from './aihubmix-client';
import { buildCardAutofillPrompt } from './card-autofill-prompt-builder';
import type { GeneratedCardDetails } from './card-autofill-schema';
import { autoFillCardViaGoogle } from './google-client';
import { autoFillCardViaGroq } from './groq-client';
import { autoFillCardViaOpenrouter } from './openrouter-client';
import { withProviderFallback } from './with-provider-fallback';

export { hasRequiredAiCredentials } from './with-provider-fallback';

/** Auto-fills a card's back-side fields (definition, IPA, hint, examples, parts of speech,
 *  suggested tags) from just its front title, using the provider(s) configured in Settings,
 *  see `withProviderFallback` for the fallback semantics. */
export async function autoFillCardDetails(
  settings: AppSettings,
  title: string,
  deckName?: string,
): Promise<GeneratedCardDetails> {
  const prompt = buildCardAutofillPrompt(title, deckName);
  return withProviderFallback(settings, {
    google: (apiKey) => autoFillCardViaGoogle(apiKey, prompt),
    groq: (apiKey, baseUrl, model) => autoFillCardViaGroq(apiKey, baseUrl, model, prompt),
    openrouter: (apiKey, baseUrl, model) =>
      autoFillCardViaOpenrouter(apiKey, baseUrl, model, prompt),
    aihubmix: (apiKey, baseUrl) => autoFillCardViaAihubmix(apiKey, baseUrl, prompt),
  });
}
