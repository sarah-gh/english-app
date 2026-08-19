import { defineStore } from 'pinia';
import { ref } from 'vue';
import { settingsRepository } from '@/db/repositories';
import { DEFAULT_SETTINGS, type AppSettings, type SpeechAccent } from '@/types/settings';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS });
  const isLoaded = ref(false);

  async function fetchSettings(): Promise<void> {
    settings.value = await settingsRepository.get();
    isLoaded.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) await fetchSettings();
  }

  async function setGeminiApiKey(apiKey: string | null): Promise<void> {
    settings.value = await settingsRepository.setGeminiApiKey(apiKey);
  }

  async function setSpeechAccent(accent: SpeechAccent): Promise<void> {
    settings.value = await settingsRepository.setSpeechAccent(accent);
  }

  return { settings, isLoaded, fetchSettings, ensureLoaded, setGeminiApiKey, setSpeechAccent };
});
