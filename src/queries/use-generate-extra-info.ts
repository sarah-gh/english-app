import { useMutation } from '@tanstack/vue-query';
import { generateExtraInfo } from '@/services/ai/field-autofill-service';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

/** One-shot AI request triggered by the per-field Auto-Fill button, not a cacheable query. */
export function useGenerateExtraInfo() {
  return useMutation({
    mutationKey: queryKeys.fieldAutofill.extraInfo(),
    mutationFn: ({ settings, front, back }: { settings: AppSettings; front: string; back?: string }) =>
      generateExtraInfo(settings, front, back),
  });
}
