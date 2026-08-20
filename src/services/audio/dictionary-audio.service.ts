import { apiClient, ApiError } from '@/services/api/axiosClient';

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

    let entries: DictionaryEntry[];
    try {
      const response = await apiClient.get<DictionaryEntry[]>(
        `/${encodeURIComponent(trimmed)}`,
        { baseURL: DICTIONARY_API_BASE, meta: { provider: 'dictionary' } },
      );
      entries = response.data;
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        throw new DictionaryAudioNotFoundError(trimmed);
      }
      throw error;
    }

    const phoneticWithAudio = entries.flatMap((entry) => entry.phonetics).find((p) => p.audio);
    if (!phoneticWithAudio?.audio) throw new DictionaryAudioNotFoundError(trimmed);

    const audioUrl = phoneticWithAudio.audio.startsWith('http')
      ? phoneticWithAudio.audio
      : `https:${phoneticWithAudio.audio}`;

    let audioBlob: Blob;
    try {
      const audioResponse = await apiClient.get<Blob>(audioUrl, {
        responseType: 'blob',
        meta: { provider: 'dictionary' },
      });
      audioBlob = audioResponse.data;
    } catch {
      throw new DictionaryAudioNotFoundError(trimmed);
    }

    const phonetic =
      entries.find((entry) => entry.phonetic)?.phonetic ?? phoneticWithAudio.text ?? undefined;

    return { audioBlob, phonetic };
  },
};
