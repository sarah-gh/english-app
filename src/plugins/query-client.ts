import { QueryClient, type VueQueryPluginOptions } from '@tanstack/vue-query';
import { ApiError } from '@/services/api/axiosClient';
import { AiProviderError } from '@/services/ai/errors';

/** Retries automatic (non-mutation) queries only for failures the API layer marked retryable
 *  (network errors, 429, 5xx), and only a couple of times — this is a client-side app calling
 *  third-party APIs with the user's own keys, not a resilient backend worth hammering. */
function isRetryableError(error: unknown): boolean {
  if (error instanceof ApiError || error instanceof AiProviderError) return error.retryable;
  return false;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => isRetryableError(error) && failureCount < 2,
    },
    mutations: {
      // Multi-step fallback (e.g. Gemini -> AIHubMix) is handled explicitly inside the AI
      // service layer itself; an outer automatic retry here would just repeat that whole
      // sequence, so mutations don't retry on their own.
      retry: false,
    },
  },
});

export const vueQueryPluginOptions: VueQueryPluginOptions = { queryClient };
