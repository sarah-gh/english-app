import { useDebounceFn } from '@vueuse/core';
import { computed, ref, watch, type Ref } from 'vue';
import { wordSuggestionService } from '@/services/dictionary/word-suggestion-service';
import { useCardStore } from '@/stores/card-store';

export interface WordSuggestion {
  value: string;
  source: 'existing' | 'dictionary';
}

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;
const MAX_SUGGESTIONS = 8;

/** Suggests words for the card front-title field: instant matches against the user's own cards,
 *  plus real-English completions from the Datamuse API, debounced so typing doesn't flood it with
 *  requests. */
export function useWordAutocomplete(query: Ref<string>) {
  const cardStore = useCardStore();
  const dictionaryWords = ref<string[]>([]);
  const isLoading = ref(false);

  const existingMatches = computed<WordSuggestion[]>(() => {
    const trimmed = query.value.trim().toLowerCase();
    if (trimmed.length < MIN_QUERY_LENGTH) return [];

    const seen = new Set<string>();
    const matches: WordSuggestion[] = [];
    for (const card of cardStore.cards) {
      const key = card.frontTitle.toLowerCase();
      if (!key.startsWith(trimmed) || seen.has(key)) continue;
      seen.add(key);
      matches.push({ value: card.frontTitle, source: 'existing' });
      if (matches.length >= MAX_SUGGESTIONS) break;
    }
    return matches;
  });

  /** Bumped on every new query so a slow, now-stale response can't overwrite a newer one. */
  let requestToken = 0;

  const fetchDictionaryMatches = useDebounceFn(async (trimmed: string, token: number) => {
    try {
      const words = await wordSuggestionService.suggest(trimmed, MAX_SUGGESTIONS);
      if (token === requestToken) dictionaryWords.value = words;
    } catch {
      if (token === requestToken) dictionaryWords.value = [];
    } finally {
      if (token === requestToken) isLoading.value = false;
    }
  }, DEBOUNCE_MS);

  watch(query, (value) => {
    const trimmed = value.trim();
    requestToken += 1;
    if (trimmed.length < MIN_QUERY_LENGTH) {
      dictionaryWords.value = [];
      isLoading.value = false;
      return;
    }
    isLoading.value = true;
    void fetchDictionaryMatches(trimmed, requestToken);
  });

  const suggestions = computed<WordSuggestion[]>(() => {
    const existingWords = new Set(existingMatches.value.map((match) => match.value.toLowerCase()));
    const dictionaryMatches: WordSuggestion[] = dictionaryWords.value
      .filter((word) => !existingWords.has(word.toLowerCase()))
      .map((word) => ({ value: word, source: 'dictionary' as const }));
    return [...existingMatches.value, ...dictionaryMatches].slice(0, MAX_SUGGESTIONS);
  });

  return { suggestions, isLoading };
}
