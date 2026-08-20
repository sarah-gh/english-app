import { useMutation } from '@tanstack/vue-query';
import { autoFillWordFamily } from '@/services/ai/ai-card-autofill-service';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

/** One-shot AI request triggered by the Auto-Fill button, not a cacheable query. */
export function useAutofillWordFamily() {
  return useMutation({
    mutationKey: queryKeys.wordFamilyAutofill.generate(),
    mutationFn: ({ settings, rootWord }: { settings: AppSettings; rootWord: string }) =>
      autoFillWordFamily(settings, rootWord),
  });
}
