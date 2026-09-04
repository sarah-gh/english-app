export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'theme-mode';

const VALID_MODES: ThemeMode[] = ['light', 'dark', 'system'];

/** New users (and any session where localStorage is unavailable) get this until they explicitly
 *  choose a theme in Settings. */
const DEFAULT_THEME_MODE: ThemeMode = 'dark';

/** Reads the persisted preference straight from localStorage — synchronous and available before
 *  Vue/Pinia boot, so the very first paint can already be in the right theme. */
export function readStoredThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return VALID_MODES.includes(stored as ThemeMode) ? (stored as ThemeMode) : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

export function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveIsDark(mode: ThemeMode): boolean {
  return mode === 'dark' || (mode === 'system' && systemPrefersDark());
}

/** Toggles the `.dark` class the `@custom-variant dark` selector in main.css keys off of. */
export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', resolveIsDark(mode));
}
