import { useMutation } from '@tanstack/vue-query';
import { generateAiQuiz } from '@/services/ai/ai-quiz-service';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

/** Generating a quiz is a one-shot write-like action (it calls out to a paid third-party AI
 *  provider), not a cacheable resource — so it's modeled as a mutation, not a query. */
export function useGenerateAiQuiz() {
  return useMutation({
    mutationKey: queryKeys.aiQuiz.generate(),
    mutationFn: ({ settings, prompt }: { settings: AppSettings; prompt: string }) =>
      generateAiQuiz(settings, prompt),
  });
}
