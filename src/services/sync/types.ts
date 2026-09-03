import type { Card } from '@/types/card';
import type { Deck } from '@/types/deck';
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
}

export const SYNC_PAYLOAD_VERSION = 1;

export function emptySyncPayload(): SyncPayload {
  return { version: SYNC_PAYLOAD_VERSION, updatedAt: 0, decks: [], topics: [], tags: [], cards: [] };
}

/** Why a token request failed, from GIS's own signals:
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
 *  - `unknown` — anything else (network hiccup inside the GIS flow, unexpected response shape). */
export type SyncAuthFailureReason = 'interaction_required' | 'popup_blocked' | 'cancelled' | 'unknown';

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
