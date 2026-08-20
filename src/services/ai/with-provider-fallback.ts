import type { AppSettings, ConcreteAiProvider } from '@/types/settings';
import { AiProviderError, AiServiceError } from './errors';

/** Per-feature dispatch table: one caller per concrete provider, each already closed over its
 *  feature-specific prompt/schema. `withProviderFallback` supplies the credentials/config. */
export interface ProviderCallers<T> {
  google: (apiKey: string) => Promise<T>;
  groq: (apiKey: string, baseUrl: string, model: string) => Promise<T>;
  openrouter: (apiKey: string, baseUrl: string, model: string) => Promise<T>;
  aihubmix: (apiKey: string, baseUrl: string) => Promise<T>;
}

const PROVIDER_LABEL: Record<ConcreteAiProvider, string> = {
  google: 'Google AI Studio',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  aihubmix: 'AIHubMix',
};

function hasCredentials(settings: AppSettings, provider: ConcreteAiProvider): boolean {
  switch (provider) {
    case 'google':
      return Boolean(settings.googleApiKey);
    case 'groq':
      return Boolean(settings.groqApiKey && settings.groqBaseUrl);
    case 'openrouter':
      return Boolean(settings.openrouterApiKey && settings.openrouterBaseUrl);
    case 'aihubmix':
      return Boolean(settings.aihubmixApiKey && settings.aihubmixBaseUrl);
  }
}

/** True if the current provider selection has the credentials it needs to attempt a request. */
export function hasRequiredAiCredentials(settings: AppSettings): boolean {
  if (settings.aiProvider === 'fallback') {
    return (
      hasCredentials(settings, settings.fallbackPrimaryProvider) ||
      hasCredentials(settings, settings.fallbackBackupProvider)
    );
  }
  return hasCredentials(settings, settings.aiProvider);
}

async function callProvider<T>(
  settings: AppSettings,
  provider: ConcreteAiProvider,
  callers: ProviderCallers<T>,
): Promise<T> {
  const label = PROVIDER_LABEL[provider];
  switch (provider) {
    case 'google':
      if (!settings.googleApiKey) throw new AiServiceError(`Add a ${label} API key in Settings to continue.`);
      return callers.google(settings.googleApiKey);
    case 'groq':
      if (!settings.groqApiKey) throw new AiServiceError(`Add a ${label} API key in Settings to continue.`);
      return callers.groq(settings.groqApiKey, settings.groqBaseUrl, settings.groqModel);
    case 'openrouter':
      if (!settings.openrouterApiKey) throw new AiServiceError(`Add an ${label} API key in Settings to continue.`);
      return callers.openrouter(settings.openrouterApiKey, settings.openrouterBaseUrl, settings.openrouterModel);
    case 'aihubmix':
      if (!settings.aihubmixApiKey) throw new AiServiceError(`Add an ${label} API key in Settings to continue.`);
      return callers.aihubmix(settings.aihubmixApiKey, settings.aihubmixBaseUrl);
  }
}

/** Calls one provider and normalizes whatever it throws down to `AiServiceError`, so nothing
 *  provider-specific (`AiProviderError`) ever escapes this module. */
async function attemptProvider<T>(
  settings: AppSettings,
  provider: ConcreteAiProvider,
  callers: ProviderCallers<T>,
): Promise<T> {
  try {
    return await callProvider(settings, provider, callers);
  } catch (error) {
    throw error instanceof AiProviderError ? new AiServiceError(error.message) : error;
  }
}

/**
 * Runs an AI request using the provider(s) configured in Settings — shared by every feature that
 * calls out to the AI service layer (quiz generation, card auto-fill, ...). For a single
 * provider, it's called directly. For `'fallback'`, `fallbackPrimaryProvider` is tried first; if
 * it fails, a warning is logged and `fallbackBackupProvider` is retried automatically. An error
 * is only surfaced to the caller once every attempted provider has failed (or has no
 * credentials).
 */
export async function withProviderFallback<T>(
  settings: AppSettings,
  callers: ProviderCallers<T>,
): Promise<T> {
  if (settings.aiProvider !== 'fallback') {
    return attemptProvider(settings, settings.aiProvider, callers);
  }

  const { fallbackPrimaryProvider: primary, fallbackBackupProvider: backup } = settings;
  if (primary === backup) return attemptProvider(settings, primary, callers);

  try {
    return await attemptProvider(settings, primary, callers);
  } catch (primaryError) {
    if (!(primaryError instanceof AiServiceError)) throw primaryError;

    console.warn(
      `[ai-service] ${PROVIDER_LABEL[primary]} request failed, falling back to ${PROVIDER_LABEL[backup]}:`,
      primaryError,
    );
    try {
      return await attemptProvider(settings, backup, callers);
    } catch (backupError) {
      const backupMessage = backupError instanceof AiServiceError ? backupError.message : 'Request failed.';
      throw new AiServiceError(
        `Both providers failed. ${PROVIDER_LABEL[primary]}: ${primaryError.message} ${PROVIDER_LABEL[backup]}: ${backupMessage}`,
      );
    }
  }
}
