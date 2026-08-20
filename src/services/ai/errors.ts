import type { ConcreteAiProvider } from '@/types/settings';

/** Error raised by a single AI provider client (Google, Groq, OpenRouter, or AIHubMix). */
export class AiProviderError extends Error {
  provider: ConcreteAiProvider;
  /** True for errors worth retrying against another provider: network failures, rate limits
   *  (429), and server errors (5xx). False for client errors (bad key, bad request) that would
   *  fail against any provider the same way. */
  retryable: boolean;

  constructor(provider: ConcreteAiProvider, message: string, retryable: boolean) {
    super(message);
    this.name = 'AiProviderError';
    this.provider = provider;
    this.retryable = retryable;
  }
}

/** Raised by the fallback orchestrator when no provider could satisfy the request. */
export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceError';
  }
}
