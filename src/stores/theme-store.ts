import { defineStore } from 'pinia';
import { ref } from 'vue';
import { applyTheme, readStoredThemeMode, resolveIsDark, THEME_STORAGE_KEY, type ThemeMode } from '@/services/theme/apply-theme';

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readStoredThemeMode());
  const isDark = ref(resolveIsDark(mode.value));

  function sync(): void {
    isDark.value = resolveIsDark(mode.value);
    applyTheme(mode.value);
  }

  function setMode(next: ThemeMode): void {
    mode.value = next;
    localStorage.setItem(THEME_STORAGE_KEY, next);
    sync();
  }

  // main.ts already applies the theme synchronously before mount (avoids a flash of the wrong
  // theme); this call just brings this store's own reactive `isDark` in line with that.
  sync();

  // While on 'system', keep following the OS preference live without requiring a reload.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (mode.value === 'system') sync();
  });

  return { mode, isDark, setMode };
});
