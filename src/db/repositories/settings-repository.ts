import { db } from '@/db';
import { DEFAULT_SETTINGS, SETTINGS_ID, type AppSettings } from '@/types/settings';

export const settingsRepository = {
  /** Returns the single settings record, creating it with defaults on first run. */
  async get(): Promise<AppSettings> {
    const existing = await db.settings.get(SETTINGS_ID);
    if (existing) return existing;

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

  async setGeminiApiKey(apiKey: string | null): Promise<AppSettings> {
    return settingsRepository.update({ geminiApiKey: apiKey });
  },

  async setSpeechAccent(accent: AppSettings['speechAccent']): Promise<AppSettings> {
    return settingsRepository.update({ speechAccent: accent });
  },
};
