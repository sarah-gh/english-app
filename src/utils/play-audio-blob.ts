/** Plays a cached audio Blob (e.g. a card's dictionary-fetched pronunciation) and releases the object URL when done. */
export function playAudioBlob(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.addEventListener('ended', () => URL.revokeObjectURL(url), { once: true });
  audio.addEventListener('error', () => URL.revokeObjectURL(url), { once: true });
  void audio.play();
}
