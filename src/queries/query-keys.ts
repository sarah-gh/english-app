/** Central query/mutation key factory. Even for mutations (which don't cache), a stable key
 *  namespaces devtools entries and gives future `invalidateQueries`/`cancelQueries` calls
 *  something consistent to target instead of ad hoc string arrays scattered across components. */
export const queryKeys = {
  aiQuiz: {
    all: ['ai-quiz'] as const,
    generate: () => [...queryKeys.aiQuiz.all, 'generate'] as const,
  },
  pronunciation: {
    all: ['pronunciation'] as const,
    audio: (word: string) => [...queryKeys.pronunciation.all, 'audio', word] as const,
  },
  cardAutofill: {
    all: ['card-autofill'] as const,
    generate: () => [...queryKeys.cardAutofill.all, 'generate'] as const,
  },
  wordFamilyAutofill: {
    all: ['word-family-autofill'] as const,
    generate: () => [...queryKeys.wordFamilyAutofill.all, 'generate'] as const,
  },
};
