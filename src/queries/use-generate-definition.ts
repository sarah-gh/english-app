import { useMutation } from '@tanstack/vue-query';
import { generateDefinition } from '@/services/ai/field-autofill-service';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

/** One-shot AI request triggered by the per-field Auto-Fill button, not a cacheable query. */
export function useGenerateDefinition() {
  return useMutation({
    mutationKey: queryKeys.fieldAutofill.definition(),
    mutationFn: ({ settings, title }: { settings: AppSettings; title: string }) => generateDefinition(settings, title),
  });
}
