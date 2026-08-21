import { useMutation } from '@tanstack/vue-query';
import { generateIPA } from '@/services/ai/field-autofill-service';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

/** One-shot AI request triggered by the per-field Auto-Fill button, not a cacheable query. */
export function useGenerateIpa() {
  return useMutation({
    mutationKey: queryKeys.fieldAutofill.ipa(),
    mutationFn: ({ settings, title }: { settings: AppSettings; title: string }) => generateIPA(settings, title),
  });
}
