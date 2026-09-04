import type { AiQuizResult } from '@/types/ai-quiz-result';
import type { Card } from '@/types/card';
import type { DailyStat } from '@/types/daily-stat';
import type { Deck } from '@/types/deck';
import type { AppSettings } from '@/types/settings';
import type { Tag } from '@/types/tag';
import type { Topic } from '@/types/topic';

/** A Card as it's stored inside the sync payload: its `audioBlob`/`imageBlob` (which JSON can't
 *  carry) are swapped for `data:` URL strings — see `blob-codec.ts`. */
export type SyncCard = Omit<Card, 'audioBlob' | 'imageBlob'> & {
  audioData?: string;
  imageData?: string;
};

/** The single JSON document stored at `flashcards_sync.json` in the user's Drive `appDataFolder`. */
export interface SyncPayload {
  version: number;
  /** When this payload was last written, for diagnostics only — conflict resolution is done
   *  per-record via each entity's own `updatedAt`, not this field. */
  updatedAt: number;
  decks: Deck[];
  topics: Topic[];
  tags: Tag[];
  cards: SyncCard[];
  /** Optional only so a payload downloaded from before AI Quiz History synced (version 1) doesn't
   *  fail to parse — treated the same as an empty array wherever it's read. */
  quizHistory?: AiQuizResult[];
  /** Optional for the same reason as `quizHistory` — absent in payloads from before version 3.
   *  Merged with `mergeDailyStats`, not `mergeById` (see its own doc comment for why). */
  dailyStats?: DailyStat[];
  /** The singleton app-settings record — carries the daily study goal and CEFR proficiency level
   *  between devices, among other preferences. Optional for the same reason as `quizHistory` —
   *  absent in payloads from before version 4. Resolved with `mergeSingleton` (whole-record
   *  last-write-wins by `updatedAt`), not `mergeById`, since there's exactly one record rather than
   *  a collection. */
  settings?: AppSettings;
}

/** Bumped for the `quizHistory` (v2), `dailyStats` (v3), and `settings` (v4) additions — still
 *  only a diagnostic marker (see `SyncPayload`'s own `updatedAt` doc comment), nothing branches on
 *  the number itself. */
export const SYNC_PAYLOAD_VERSION = 4;

export function emptySyncPayload(): SyncPayload {
  return {
    version: SYNC_PAYLOAD_VERSION,
    updatedAt: 0,
    decks: [],
    topics: [],
    tags: [],
    cards: [],
    quizHistory: [],
    dailyStats: [],
    settings: undefined,
  };
}

/** Why a token request failed, from GIS's own signals:
 *  - `refresh_required` — not a GIS signal at all: the cached token is missing or spent and the
 *    caller had no user gesture to spend, so no token request was even attempted. Every GIS token
 *    path opens a real browser window (see `requestAccessToken`'s doc comment), and a window opened
 *    from a timer or a page load is exactly the flash this reason exists to prevent. The session
 *    itself is almost certainly still fine — the user's next "Sync Now" click resolves it silently
 *    — so this must never be surfaced as "sign-in expired".
 *  - `interaction_required` — a silent (`prompt: 'none'`) request came back and Google explicitly
 *    says it can't complete without the user present (expired/revoked session).
 *  - `cancelled` — GIS's `error_callback` reported `popup_closed`. For an *interactive*
 *    (`prompt: 'consent'`) request this means the user was shown a popup and closed it
 *    themselves. But a *silent* request can report this exact same thing when there's no
 *    existing Google session at all — GIS opens its popup and immediately self-closes it rather
 *    than returning a clean `interaction_required` token-response error (confirmed against the
 *    live GIS script). `getAccessToken` treats a silent-attempt `'cancelled'` the same as
 *    `interaction_required`, since only the interactive case is an actual user decision to
 *    respect.
 *  - `popup_blocked` — the browser refused to open the popup at all, most likely because the call
 *    wasn't triggered by a user gesture (a background sync, not a button click). Retrying
 *    anything here — silent or interactive — hits the same block, so the only way forward is a
 *    fresh, real click from the user.
 *  - `timeout` — GIS neither resolved nor reported an error within the request's time budget. Its
 *    callbacks are one-shot and fire-and-forget: if the window is dismissed in a way GIS doesn't
 *    observe, neither `callback` nor `error_callback` ever runs, and without this the awaiting
 *    promise would hang for the life of the tab (taking the sync spinner with it).
 *  - `unknown` — anything else (network hiccup inside the GIS flow, unexpected response shape). */
export type SyncAuthFailureReason =
  | 'refresh_required'
  | 'interaction_required'
  | 'popup_blocked'
  | 'cancelled'
  | 'timeout'
  | 'unknown';

/** Google sign-in didn't happen, was cancelled, or the token could not be refreshed silently. */
export class SyncAuthError extends Error {
  reason: SyncAuthFailureReason;

  constructor(message = 'Could not connect to your Google account. Please sign in again.', reason: SyncAuthFailureReason = 'unknown') {
    super(message);
    this.name = 'SyncAuthError';
    this.reason = reason;
  }
}

/** No network, or Google Drive could not be reached — local data is untouched and safe. */
export class SyncOfflineError extends Error {
  constructor(message = 'Sync failed. Changes saved locally.') {
    super(message);
    this.name = 'SyncOfflineError';
  }
}

/** `VITE_GOOGLE_CLIENT_ID` isn't set, so Cloud Sync has nothing to authenticate against. */
export class SyncNotConfiguredError extends Error {
  constructor(message = 'Cloud Sync is not configured for this app.') {
    super(message);
    this.name = 'SyncNotConfiguredError';
  }
}

export interface SyncSummary {
  pulled: number;
  pushed: number;
  syncedAt: number;
}
