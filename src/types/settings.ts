export type SpeechAccent = 'en-US' | 'en-GB';

export interface AppSettings {
  /** Fixed primary key — settings is a single-record ("singleton") table. */
  id: 'app-settings';
  speechAccent: SpeechAccent;
  /** Gemini API key, stored locally only. Null until the user provides one. */
  geminiApiKey: string | null;
  /** True once the first-launch sample decks/cards have been seeded, so it never happens twice. */
  hasSeededInitialData: boolean;
  updatedAt: number;
}

export const SETTINGS_ID = 'app-settings' as const;

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  speechAccent: 'en-US',
  geminiApiKey: null,
  hasSeededInitialData: false,
  updatedAt: 0,
};
