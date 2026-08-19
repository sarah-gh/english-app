import { useSpeech } from '@/composables/useSpeech';
import type { Card } from '@/types/card';
import { playAudioBlob } from '@/utils/play-audio-blob';

/** Plays TTS if the card has it enabled, otherwise falls back to a cached dictionary audio blob. */
export function useCardAudio() {
  const { speak } = useSpeech();

  function playCardAudio(card: Card): void {
    if (card.ttsEnabled) {
      speak(card.frontTitle);
    } else if (card.audioBlob) {
      playAudioBlob(card.audioBlob);
    } else {
      speak(card.frontTitle);
    }
  }

  return { playCardAudio };
}
