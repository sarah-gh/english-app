import { useMutation } from '@tanstack/vue-query';
import { generateDescriptiveQuiz, generateMultipleChoiceQuiz } from '@/services/ai/ai-quiz-service';
import type { Card } from '@/types/card';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

interface GenerateQuizInput {
  settings: AppSettings;
  cards: Card[];
  questionCount: number;
}

/** Generating a quiz is a one-shot write-like action (it calls out to a paid third-party AI
 *  provider), not a cacheable resource — so it's modeled as a mutation, not a query. Kept as two
 *  separate hooks (rather than one taking a mode flag) so each stays strongly typed to its own
 *  question shape instead of a union the caller would need to narrow. */
export function useGenerateMultipleChoiceQuiz() {
  return useMutation({
    mutationKey: queryKeys.aiQuiz.generateMultipleChoice(),
    mutationFn: ({ settings, cards, questionCount }: GenerateQuizInput) =>
      generateMultipleChoiceQuiz(settings, cards, questionCount),
  });
}

export function useGenerateDescriptiveQuiz() {
  return useMutation({
    mutationKey: queryKeys.aiQuiz.generateDescriptive(),
    mutationFn: ({ settings, cards, questionCount }: GenerateQuizInput) =>
      generateDescriptiveQuiz(settings, cards, questionCount),
  });
}
