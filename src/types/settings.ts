export type SpeechAccent = 'en-US' | 'en-GB';

/**
 * Which AI backend the Quiz Generator uses. `'fallback'` tries Gemini first and automatically
 * retries via AIHubMix if Gemini fails (network error, rate limit, server error, etc).
 */
export type AiProvider = 'gemini' | 'aihubmix' | 'fallback';

export interface AppSettings {
  /** Fixed primary key — settings is a single-record ("singleton") table. */
  id: 'app-settings';
  speechAccent: SpeechAccent;
  /** Gemini API key, stored locally only. Null until the user provides one. */
  geminiApiKey: string | null;
  /** Which AI backend the Quiz Generator uses. */
  aiProvider: AiProvider;
  /** AIHubMix API key, stored locally only. Null until the user provides one. */
  aihubmixApiKey: string | null;
  /** Base URL for the AIHubMix proxy. */
  aihubmixBaseUrl: string;
  /** True once the first-launch sample decks/cards have been seeded, so it never happens twice. */
  hasSeededInitialData: boolean;
  updatedAt: number;
}

export const SETTINGS_ID = 'app-settings' as const;

export const DEFAULT_AIHUBMIX_BASE_URL = 'https://aihubmix.com';

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  speechAccent: 'en-US',
  geminiApiKey: null,
  aiProvider: 'gemini',
  aihubmixApiKey: null,
  aihubmixBaseUrl: DEFAULT_AIHUBMIX_BASE_URL,
  hasSeededInitialData: false,
  updatedAt: 0,
};
