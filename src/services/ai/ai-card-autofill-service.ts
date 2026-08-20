import type { AppSettings } from '@/types/settings';
import { autoFillCardViaAihubmix, autoFillWordFamilyViaAihubmix } from './aihubmix-client';
import { buildCardAutofillPrompt, buildWordFamilyAutofillPrompt } from './card-autofill-prompt-builder';
import type { GeneratedCardDetails } from './card-autofill-schema';
import { autoFillCardViaGoogle, autoFillWordFamilyViaGoogle } from './google-client';
import { autoFillCardViaGroq, autoFillWordFamilyViaGroq } from './groq-client';
import { autoFillCardViaOpenrouter, autoFillWordFamilyViaOpenrouter } from './openrouter-client';
import { withProviderFallback } from './with-provider-fallback';
import type { GeneratedWordFamily } from './word-family-schema';

export { hasRequiredAiCredentials } from './with-provider-fallback';

/** Auto-fills a card's back-side fields (definition, IPA, hint, examples, parts of speech,
 *  suggested tags) from just its front title, using the provider(s) configured in Settings —
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
    openrouter: (apiKey, baseUrl, model) => autoFillCardViaOpenrouter(apiKey, baseUrl, model, prompt),
    aihubmix: (apiKey, baseUrl) => autoFillCardViaAihubmix(apiKey, baseUrl, prompt),
  });
}

/** Auto-fills a Word Family card's Noun/Verb/Adjective/Adverb forms from just its root word,
 *  using the provider(s) configured in Settings — see `withProviderFallback` for the fallback
 *  semantics. */
export async function autoFillWordFamily(
  settings: AppSettings,
  rootWord: string,
): Promise<GeneratedWordFamily> {
  const prompt = buildWordFamilyAutofillPrompt(rootWord);
  return withProviderFallback(settings, {
    google: (apiKey) => autoFillWordFamilyViaGoogle(apiKey, prompt),
    groq: (apiKey, baseUrl, model) => autoFillWordFamilyViaGroq(apiKey, baseUrl, model, prompt),
    openrouter: (apiKey, baseUrl, model) => autoFillWordFamilyViaOpenrouter(apiKey, baseUrl, model, prompt),
    aihubmix: (apiKey, baseUrl) => autoFillWordFamilyViaAihubmix(apiKey, baseUrl, prompt),
  });
}
