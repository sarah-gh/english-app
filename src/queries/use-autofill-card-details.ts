import { useMutation } from '@tanstack/vue-query';
import { autoFillCardDetails } from '@/services/ai/ai-card-autofill-service';
import type { AppSettings } from '@/types/settings';
import { queryKeys } from './query-keys';

/** One-shot AI request triggered by the Auto-Fill button, not a cacheable query. */
export function useAutofillCardDetails() {
  return useMutation({
    mutationKey: queryKeys.cardAutofill.generate(),
    mutationFn: ({ settings, title, deckName }: { settings: AppSettings; title: string; deckName?: string }) =>
      autoFillCardDetails(settings, title, deckName),
  });
}
