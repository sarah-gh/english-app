export type SpeechAccent = 'en-US' | 'en-GB';

/** AI backends the Quiz Generator and Card Auto-Fill can call directly. */
export type ConcreteAiProvider = 'google' | 'groq' | 'openrouter' | 'aihubmix';

/** Which AI backend is active. `'fallback'` tries `fallbackPrimaryProvider` first and
 *  automatically retries `fallbackBackupProvider` if the primary fails (network error, rate
 *  limit, server error, missing credentials, etc). */
export type AiProvider = ConcreteAiProvider | 'fallback';

export interface AppSettings {
  /** Fixed primary key — settings is a single-record ("singleton") table. */
  id: 'app-settings';
  speechAccent: SpeechAccent;

  aiProvider: AiProvider;

  /** Google AI Studio (Gemini) API key, stored locally only. */
  googleApiKey: string | null;

  /** Groq API key, base URL, and model — all stored locally only. */
  groqApiKey: string | null;
  groqBaseUrl: string;
  groqModel: string;

  /** OpenRouter API key, base URL, and model — all stored locally only. */
  openrouterApiKey: string | null;
  openrouterBaseUrl: string;
  openrouterModel: string;

  /** AIHubMix API key and base URL — stored locally only. */
  aihubmixApiKey: string | null;
  aihubmixBaseUrl: string;

  /** Only consulted when `aiProvider === 'fallback'`: try this provider first... */
  fallbackPrimaryProvider: ConcreteAiProvider;
  /** ...then this one if the primary fails. */
  fallbackBackupProvider: ConcreteAiProvider;

  /** True once the first-launch sample decks/cards have been seeded, so it never happens twice. */
  hasSeededInitialData: boolean;
  updatedAt: number;
}

/** Every AI-provider-related field, as saved together from the Settings form in one action. */
export type AiConfigFields = Pick<
  AppSettings,
  | 'aiProvider'
  | 'googleApiKey'
  | 'groqApiKey'
  | 'groqBaseUrl'
  | 'groqModel'
  | 'openrouterApiKey'
  | 'openrouterBaseUrl'
  | 'openrouterModel'
  | 'aihubmixApiKey'
  | 'aihubmixBaseUrl'
  | 'fallbackPrimaryProvider'
  | 'fallbackBackupProvider'
>;

export const SETTINGS_ID = 'app-settings' as const;

export const DEFAULT_GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
export const DEFAULT_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
export const DEFAULT_OPENROUTER_MODEL = 'google/gemini-2.0-flash-exp:free';
export const DEFAULT_AIHUBMIX_BASE_URL = 'https://aihubmix.com';

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_ID,
  speechAccent: 'en-US',
  aiProvider: 'google',
  googleApiKey: null,
  groqApiKey: null,
  groqBaseUrl: DEFAULT_GROQ_BASE_URL,
  groqModel: DEFAULT_GROQ_MODEL,
  openrouterApiKey: null,
  openrouterBaseUrl: DEFAULT_OPENROUTER_BASE_URL,
  openrouterModel: DEFAULT_OPENROUTER_MODEL,
  aihubmixApiKey: null,
  aihubmixBaseUrl: DEFAULT_AIHUBMIX_BASE_URL,
  fallbackPrimaryProvider: 'google',
  fallbackBackupProvider: 'groq',
  hasSeededInitialData: false,
  updatedAt: 0,
};
