import { useMutation } from '@tanstack/vue-query';
import { generateExamples } from '@/services/ai/field-autofill-service';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

/** One-shot AI request triggered by the per-field Auto-Fill button, not a cacheable query. */
export function useGenerateExamples() {
  return useMutation({
    mutationKey: queryKeys.fieldAutofill.examples(),
    mutationFn: ({ settings, title, count }: { settings: AppSettings; title: string; count: number }) =>
      generateExamples(settings, title, count),
  });
}
