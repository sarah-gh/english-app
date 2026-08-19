import { speechSynthesisService } from '@/services/tts/speech-synthesis.service';
import { useSettingsStore } from '@/stores/settings-store';

/** Speaks text using the user's saved accent preference (defaults to en-US until settings load). */
export function useSpeech() {
  const settingsStore = useSettingsStore();

  function speak(text: string): void {
    speechSynthesisService.speak(text, settingsStore.settings.speechAccent);
  }

  function stop(): void {
    speechSynthesisService.stop();
  }

  return {
    speak,
    stop,
    isSupported: speechSynthesisService.isSupported(),
  };
}
