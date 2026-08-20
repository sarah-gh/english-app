import { apiClient } from '@/services/api/axiosClient';

const DATAMUSE_API_BASE = 'https://api.datamuse.com';

interface DatamuseSuggestion {
  word: string;
  score: number;
}

/**
 * Free, keyless word-completion lookup against the Datamuse API, used to suggest real English
 * words as the user types a card's front title.
 */
export const wordSuggestionService = {
  async suggest(query: string, max = 8): Promise<string[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    const response = await apiClient.get<DatamuseSuggestion[]>('/sug', {
      baseURL: DATAMUSE_API_BASE,
      params: { s: trimmed, max },
      meta: { provider: 'datamuse' },
    });
    return response.data.map((entry) => entry.word);
  },
};
