import { db } from '@/db';
import {
  DEFAULT_SETTINGS,
  SETTINGS_ID,
  type AiConfigFields,
  type AppSettings,
  type ConcreteAiProvider,
} from '@/types/settings';

const VALID_CONCRETE_PROVIDERS: ConcreteAiProvider[] = ['google', 'groq', 'openrouter', 'aihubmix'];

/** Shape of settings records written by builds before the Google/Groq/OpenRouter provider
 *  rename — kept only so `migrateSettings` has something to read the old field names off of. */
interface LegacySettingsFields {
  geminiApiKey?: string | null;
}

/**
 * Back-fills any field the current schema expects that an older record doesn't have, and remaps
 * the one enum value that was renamed (`'gemini'` -> `'google'`). Without this, a settings
 * record written before a provider rename or new field was added would come back missing data —
 * which looks indistinguishable from "my settings got reset" to the user, even though nothing
 * was actually deleted.
 */
function migrateSettings(stored: AppSettings): AppSettings {
  const legacy = stored as AppSettings & LegacySettingsFields;
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...legacy };

  if (![...VALID_CONCRETE_PROVIDERS, 'fallback'].includes(merged.aiProvider)) {
    merged.aiProvider = (merged.aiProvider as string) === 'gemini' ? 'google' : DEFAULT_SETTINGS.aiProvider;
  }
  if (!VALID_CONCRETE_PROVIDERS.includes(merged.fallbackPrimaryProvider)) {
    merged.fallbackPrimaryProvider = DEFAULT_SETTINGS.fallbackPrimaryProvider;
  }
  if (!VALID_CONCRETE_PROVIDERS.includes(merged.fallbackBackupProvider)) {
    merged.fallbackBackupProvider = DEFAULT_SETTINGS.fallbackBackupProvider;
  }
  if (!merged.googleApiKey && legacy.geminiApiKey) {
    merged.googleApiKey = legacy.geminiApiKey;
  }

  return merged;
}

export const settingsRepository = {
  /** Returns the single settings record, creating it with defaults on first run. */
  async get(): Promise<AppSettings> {
    const existing = await db.settings.get(SETTINGS_ID);
    if (existing) return migrateSettings(existing);

    const initial: AppSettings = { ...DEFAULT_SETTINGS, updatedAt: Date.now() };
    await db.settings.put(initial);
    return initial;
  },

  async update(changes: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    const current = await settingsRepository.get();
    const updated: AppSettings = { ...current, ...changes, updatedAt: Date.now() };
    await db.settings.put(updated);
    return updated;
  },

  async setAiConfig(config: AiConfigFields): Promise<AppSettings> {
    return settingsRepository.update(config);
  },

  async setSpeechAccent(accent: AppSettings['speechAccent']): Promise<AppSettings> {
    return settingsRepository.update({ speechAccent: accent });
  },
};
