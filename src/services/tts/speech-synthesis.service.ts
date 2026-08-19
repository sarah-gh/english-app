import type { SpeechAccent } from '@/types/settings';

function getVoices(): SpeechSynthesisVoice[] {
  return window.speechSynthesis?.getVoices() ?? [];
}

/** Prefers an exact accent match, falls back to any English voice, then to the browser default. */
function pickVoice(accent: SpeechAccent): SpeechSynthesisVoice | undefined {
  const voices = getVoices();
  return (
    voices.find((voice) => voice.lang === accent) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith('en')) ??
    voices[0]
  );
}

export const speechSynthesisService = {
  isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  },

  /**
   * Some browsers populate the voice list asynchronously after page load.
   * Resolves once voices are available, or after a short timeout so callers never hang.
   */
  waitForVoices(timeoutMs = 1000): Promise<SpeechSynthesisVoice[]> {
    if (!this.isSupported()) return Promise.resolve([]);

    const existing = getVoices();
    if (existing.length > 0) return Promise.resolve(existing);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (voices: SpeechSynthesisVoice[]) => {
        if (settled) return;
        settled = true;
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
        resolve(voices);
      };
      const handleVoicesChanged = () => finish(getVoices());

      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
      setTimeout(() => finish(getVoices()), timeoutMs);
    });
  },

  speak(text: string, accent: SpeechAccent): void {
    if (!this.isSupported() || !text.trim()) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = accent;
    const voice = pickVoice(accent);
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  },

  stop(): void {
    if (this.isSupported()) window.speechSynthesis.cancel();
  },
};
