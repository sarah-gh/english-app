const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export class DictionaryAudioNotFoundError extends Error {
  constructor(word: string) {
    super(`No pronunciation audio found for "${word}".`);
    this.name = 'DictionaryAudioNotFoundError';
  }
}

export interface DictionaryPronunciation {
  audioBlob: Blob;
  phonetic?: string;
}

interface DictionaryPhonetic {
  text?: string;
  audio?: string;
}

interface DictionaryEntry {
  phonetic?: string;
  phonetics: DictionaryPhonetic[];
}

/**
 * Looks up a word on the Free Dictionary API and downloads the first available
 * human pronunciation audio clip as a Blob, ready to cache in the card's IndexedDB record.
 */
export const dictionaryAudioService = {
  async fetchPronunciation(word: string): Promise<DictionaryPronunciation> {
    const trimmed = word.trim();
    if (!trimmed) throw new DictionaryAudioNotFoundError(word);

    const response = await fetch(`${DICTIONARY_API_BASE}/${encodeURIComponent(trimmed)}`);
    if (!response.ok) throw new DictionaryAudioNotFoundError(trimmed);

    const entries = (await response.json()) as DictionaryEntry[];
    const phoneticWithAudio = entries.flatMap((entry) => entry.phonetics).find((p) => p.audio);
    if (!phoneticWithAudio?.audio) throw new DictionaryAudioNotFoundError(trimmed);

    const audioUrl = phoneticWithAudio.audio.startsWith('http')
      ? phoneticWithAudio.audio
      : `https:${phoneticWithAudio.audio}`;

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) throw new DictionaryAudioNotFoundError(trimmed);

    const audioBlob = await audioResponse.blob();
    const phonetic =
      entries.find((entry) => entry.phonetic)?.phonetic ?? phoneticWithAudio.text ?? undefined;

    return { audioBlob, phonetic };
  },
};
