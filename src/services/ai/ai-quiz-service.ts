import type { AppSettings } from '@/types/settings';
import { generateQuizViaAihubmix } from './aihubmix-client';
import { AiProviderError, AiServiceError } from './errors';
import { generateQuizViaGemini } from './gemini-client';
import type { GeneratedQuizQuestion } from './quiz-schema';

/** True if the current provider selection has the credentials it needs to attempt a request. */
export function hasRequiredAiCredentials(settings: AppSettings): boolean {
  const hasGemini = Boolean(settings.geminiApiKey);
  const hasAihubmix = Boolean(settings.aihubmixApiKey && settings.aihubmixBaseUrl);
  if (settings.aiProvider === 'gemini') return hasGemini;
  if (settings.aiProvider === 'aihubmix') return hasAihubmix;
  return hasGemini || hasAihubmix;
}

/**
 * Generates a quiz using the provider configured in Settings. In `'fallback'` mode, Gemini is
 * tried first; if it fails, a warning is logged and AIHubMix is retried automatically. An error
 * is only surfaced to the UI once every available provider has failed (or has no credentials).
 */
export async function generateAiQuiz(
  settings: AppSettings,
  prompt: string,
): Promise<GeneratedQuizQuestion[]> {
  const { aiProvider, geminiApiKey, aihubmixApiKey, aihubmixBaseUrl } = settings;

  if (aiProvider === 'gemini') {
    if (!geminiApiKey) throw new AiServiceError('Add a Gemini API key in Settings to generate a quiz.');
    return generateQuizViaGemini(geminiApiKey, prompt);
  }

  if (aiProvider === 'aihubmix') {
    if (!aihubmixApiKey) throw new AiServiceError('Add an AIHubMix API key in Settings to generate a quiz.');
    return generateQuizViaAihubmix(aihubmixApiKey, aihubmixBaseUrl, prompt);
  }

  // Automatic fallback: try Gemini first, then AIHubMix.
  let geminiFailure: AiProviderError | undefined;
  if (geminiApiKey) {
    try {
      return await generateQuizViaGemini(geminiApiKey, prompt);
    } catch (error) {
      geminiFailure = error instanceof AiProviderError ? error : undefined;
      console.warn('[ai-quiz-service] Gemini request failed, falling back to AIHubMix:', error);
    }
  }

  if (aihubmixApiKey) {
    try {
      return await generateQuizViaAihubmix(aihubmixApiKey, aihubmixBaseUrl, prompt);
    } catch (error) {
      const message = error instanceof AiProviderError ? error.message : 'AIHubMix request failed.';
      throw new AiServiceError(
        geminiFailure
          ? `Both providers failed. Gemini: ${geminiFailure.message} AIHubMix: ${message}`
          : message,
      );
    }
  }

  if (geminiFailure) {
    throw new AiServiceError(
      `Gemini failed and no AIHubMix API key is configured to fall back to. Gemini: ${geminiFailure.message}`,
    );
  }

  throw new AiServiceError(
    'Add a Gemini API key, an AIHubMix API key, or both in Settings to generate a quiz.',
  );
}
