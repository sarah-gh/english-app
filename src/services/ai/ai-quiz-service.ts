import type { AppSettings } from '@/types/settings';
import { generateQuizViaAihubmix } from './aihubmix-client';
import { generateQuizViaGoogle } from './google-client';
import { generateQuizViaGroq } from './groq-client';
import { generateQuizViaOpenrouter } from './openrouter-client';
import type { GeneratedQuizQuestion } from './quiz-schema';
import { withProviderFallback } from './with-provider-fallback';

export { hasRequiredAiCredentials } from './with-provider-fallback';

/** Generates a quiz using the provider(s) configured in Settings — see `withProviderFallback`
 *  for the fallback semantics. */
export async function generateAiQuiz(
  settings: AppSettings,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  return withProviderFallback(settings, {
    google: (apiKey) => generateQuizViaGoogle(apiKey, prompt),
    groq: (apiKey, baseUrl, model) => generateQuizViaGroq(apiKey, baseUrl, model, prompt),
    openrouter: (apiKey, baseUrl, model) => generateQuizViaOpenrouter(apiKey, baseUrl, model, prompt),
    aihubmix: (apiKey, baseUrl) => generateQuizViaAihubmix(apiKey, baseUrl, prompt),
  });
}
