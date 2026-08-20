import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ConcreteAiProvider } from '@/types/settings';

/** Which backend a request targets — used to attribute/format errors consistently. */
export type ApiProvider = ConcreteAiProvider | 'dictionary' | 'datamuse';

declare module 'axios' {
  interface AxiosRequestConfig {
    /** Centralized-instance metadata: which provider this call targets, and how to auth it.
     *  Read by the request interceptor (to attach the key) and the error interceptor (to shape
     *  the message). Not sent over the wire. */
    meta?: {
      provider: ApiProvider;
      apiKey?: string;
      /** Header name the API key is sent under. Defaults to `X-goog-api-key`. */
      apiKeyHeader?: string;
    };
  }
}

/** Normalized error thrown for every failed request made through `apiClient`, regardless of
 *  provider or failure mode (network, 4xx, 5xx). */
export class ApiError extends Error {
  provider?: ApiProvider;
  status?: number;
  /** True for failures worth retrying — network errors, 429, 5xx. False for 4xx client errors
   *  (bad key, bad request) that would fail identically on a retry. */
  retryable: boolean;

  constructor(
    message: string,
    options: { provider?: ApiProvider; status?: number; retryable: boolean },
  ) {
    super(message);
    this.name = 'ApiError';
    this.provider = options.provider;
    this.status = options.status;
    this.retryable = options.retryable;
  }
}

const PROVIDER_LABEL: Record<ApiProvider, string> = {
  google: 'Google AI Studio',
  groq: 'Groq',
  openrouter: 'OpenRouter',
  aihubmix: 'AIHubMix',
  dictionary: 'the pronunciation service',
  datamuse: 'the word suggestion service',
};

/** Centralized Axios instance for every HTTP call in the app. `baseURL` is intentionally left
 *  unset here and supplied per-request (via `{ baseURL }` in the request config) since the app
 *  talks to several independent backends (Gemini, AIHubMix, the dictionary API) rather than one
 *  fixed server. */
export const apiClient = axios.create({
  timeout: 30_000,
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { apiKey, apiKeyHeader } = config.meta ?? {};
  if (apiKey) {
    config.headers.set(apiKeyHeader ?? 'X-goog-api-key', apiKey);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const provider = error.config?.meta?.provider;
    const label = provider ? PROVIDER_LABEL[provider] : 'the server';

    if (!error.response) {
      return Promise.reject(
        new ApiError(`Could not reach ${label}. Check your connection and try again.`, {
          provider,
          retryable: true,
        }),
      );
    }

    const status = error.response.status;

    if (status === 400 || status === 401 || status === 403) {
      return Promise.reject(
        new ApiError(`${label} rejected the request — check that your API key is valid.`, {
          provider,
          status,
          retryable: false,
        }),
      );
    }
    if (status === 429) {
      return Promise.reject(
        new ApiError(`${label} rate limit reached. Please wait a moment and try again.`, {
          provider,
          status,
          retryable: true,
        }),
      );
    }
    if (status >= 500) {
      return Promise.reject(
        new ApiError(`${label} error (${status}). Please try again.`, {
          provider,
          status,
          retryable: true,
        }),
      );
    }
    return Promise.reject(
      new ApiError(`${label} error (${status}). Please try again.`, {
        provider,
        status,
        retryable: false,
      }),
    );
  },
);
