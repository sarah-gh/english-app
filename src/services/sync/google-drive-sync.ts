import { cardToSyncCard, syncCardToCard } from '@/services/sync/card-codec';
import {
  aiQuizResultRepository,
  cardRepository,
  dailyStatRepository,
  deckRepository,
  settingsRepository,
  tagRepository,
  topicRepository,
} from '@/db/repositories';
import { deduplicateLocalData } from '@/services/sync/deduplicate-local-data';
import {
  createSyncFile,
  deleteSyncFile,
  DriveApiError,
  downloadSyncFile,
  fetchUserProfile,
  findSyncFileId,
  updateSyncFile,
  type GoogleProfile,
} from '@/services/sync/drive-api';
import {
  loadGoogleIdentityScript,
  requestAccessToken,
  revokeAccessToken,
  type AccessTokenResult,
} from '@/services/sync/google-identity';
import { mergeById, mergeCards, mergeDailyStats, mergeSingleton } from '@/services/sync/merge';
import {
  emptySyncPayload,
  SYNC_PAYLOAD_VERSION,
  SyncAuthError,
  SyncNotConfiguredError,
  SyncOfflineError,
  type SyncCard,
  type SyncPayload,
  type SyncSummary,
} from '@/services/sync/types';
import type { AiQuizResult } from '@/types/ai-quiz-result';
import type { DailyStat } from '@/types/daily-stat';
import type { AppSettings } from '@/types/settings';

const CLIENT_ID: string | undefined = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const STORAGE_KEYS = {
  isConnected: 'flashcards:google-sync:is-connected',
  profile: 'flashcards:google-sync:profile',
  lastSyncedAt: 'flashcards:google-sync:last-synced-at',
  accessToken: 'flashcards:google-sync:access-token',
} as const;

/** Also mirrored to `localStorage` (see `persistToken`/`loadPersistedToken`) so a still-valid
 *  token survives a page reload instead of forcing `initOnStartup`'s background sync into a
 *  `prompt: 'none'` request every single time — which, with no cached token, always looked like a
 *  fresh silent-auth attempt from a non-gesture context and got popup-blocked, flipping
 *  `needsReauth` even seconds after a real sign-in. Persisting a short-lived (≤1hr), narrowly
 *  scoped (`drive.appdata` + basic profile) bearer token to localStorage does widen what a
 *  same-origin XSS or a malicious browser extension could read compared to keeping it purely in
 *  memory — accepted here because the alternative (logging the user out on every refresh) is
 *  worse, and the app already stores the signed-in profile (name/email/picture) in localStorage
 *  the same way. */
let cachedToken: AccessTokenResult | null = null;
let remoteFileId: string | null = null;

/** A token counts as usable right up until this close to its real expiry — only enough head room
 *  to cover a request that's already in flight when the clock runs out.
 *
 *  Deliberately narrow, and that narrowness is the point. This margin used to be ten minutes,
 *  shared with the renewal lead time below, which meant a token with nine perfectly good minutes
 *  left was treated as unusable: a page reload in that window sent the startup sync into a GIS
 *  request it had no user gesture to make, which the browser popup-blocked, which surfaced to the
 *  user as "Sign-in expired" — on a session that was never expired at all. */
const TOKEN_USABLE_MARGIN_MS = 60_000;

/** How much life left before a call that *is* allowed to open a window renews the token up front,
 *  rather than letting a long sync run past expiry and eat a mid-flight 401. Only ever applied to
 *  gesture-bound callers: renewing means a GIS request, and a GIS request means a real window. */
const TOKEN_RENEW_MARGIN_MS = 5 * 60_000;

function loadPersistedToken(): AccessTokenResult | null {
  const raw = localStorage.getItem(STORAGE_KEYS.accessToken);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<AccessTokenResult>;
    if (typeof parsed.accessToken !== 'string' || typeof parsed.expiresAt !== 'number' || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      return null;
    }
    return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt };
  } catch {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    return null;
  }
}

function persistToken(result: AccessTokenResult): void {
  localStorage.setItem(STORAGE_KEYS.accessToken, JSON.stringify(result));
}

function clearPersistedToken(): void {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
}

function setCachedToken(result: AccessTokenResult): void {
  cachedToken = result;
  persistToken(result);
}

/* There is deliberately no timer-based token renewal here, and there must not be one.
 *
 * A previous version scheduled a `prompt: 'none'` renewal ~10 minutes before expiry. Because an
 * access token lives an hour, that timer fired ~50 minutes into every session and — since GIS has
 * no hidden-iframe silent mode, and even `prompt: 'none'` opens a real browser window that
 * immediately self-closes (see `requestAccessToken`'s doc comment) — the user saw a window flash
 * open and shut, out of nowhere, roughly once an hour. Worse, a restored token already inside the
 * renewal window scheduled that same timer with a 5-second floor, so the flash also landed a few
 * seconds after certain page loads.
 *
 * It bought nothing in exchange. A `window.open` that doesn't originate from a user gesture is
 * blocked outright by strict popup policies (and by every mobile browser worth naming), so the
 * renewal it was flashing for usually failed anyway. Renewal now happens lazily, and only inside a
 * real user gesture — see `getAccessToken`. */

// Hydrate from localStorage as soon as this module loads, so `initOnStartup`'s background sync
// (and anything else that runs before a user gesture happens) finds a usable cached token instead
// of unconditionally hitting a silent GIS request that has no way to succeed without one.
cachedToken = loadPersistedToken();

/** Notified whenever another tab changes the shared session — see the `storage` listener below. */
type SessionChangeListener = () => void;
const sessionChangeListeners = new Set<SessionChangeListener>();

export function onSessionChanged(listener: SessionChangeListener): () => void {
  sessionChangeListeners.add(listener);
  return () => {
    sessionChangeListeners.delete(listener);
  };
}

/** Keeps every open tab on the same session, in place of the old `visibilitychange` handler that
 *  fired a silent token request each time a tab came back to the foreground — another
 *  non-gesture GIS call, and so another source of the same window flash.
 *
 *  `storage` fires only in the tabs that *didn't* do the writing, which is exactly the set that
 *  needs to catch up. It gives this tab three things for free, with no network and no popup:
 *  a token another tab just renewed (so only one tab ever pays for a renewal), a sign-out
 *  performed elsewhere (so a disconnected tab stops claiming it's connected), and a fresh
 *  `lastSyncedAt` from another tab's sync (so the UI stops showing a stale "Last synced"). */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (!event.key || !(Object.values(STORAGE_KEYS) as string[]).includes(event.key)) return;

    if (event.key === STORAGE_KEYS.accessToken) {
      cachedToken = loadPersistedToken();
      return;
    }
    // A sign-out in another tab invalidates this tab's in-memory session too — the token it's
    // holding was revoked by that `disconnect`, and the cached file id belongs to an account this
    // browser is no longer signed in to.
    if (event.key === STORAGE_KEYS.isConnected && !isGoogleConnected()) {
      cachedToken = null;
      remoteFileId = null;
    }
    sessionChangeListeners.forEach((listener) => listener());
  });
}

export function isCloudSyncConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

export function isGoogleConnected(): boolean {
  return localStorage.getItem(STORAGE_KEYS.isConnected) === 'true';
}

export function getStoredProfile(): GoogleProfile | null {
  const raw = localStorage.getItem(STORAGE_KEYS.profile);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getLastSyncedAt(): number | null {
  const raw = localStorage.getItem(STORAGE_KEYS.lastSyncedAt);
  return raw ? Number(raw) : null;
}

function persistConnected(profile: GoogleProfile): void {
  localStorage.setItem(STORAGE_KEYS.isConnected, 'true');
  localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
}

function clearConnected(): void {
  localStorage.removeItem(STORAGE_KEYS.isConnected);
  localStorage.removeItem(STORAGE_KEYS.profile);
  localStorage.removeItem(STORAGE_KEYS.lastSyncedAt);
  cachedToken = null;
  remoteFileId = null;
  clearPersistedToken();
}

/** Preloads the GIS script — call this as soon as the Cloud Sync UI mounts so the later
 *  user-initiated "Connect" click can request a token with no async gap before it (see
 *  `loadGoogleIdentityScript`'s doc comment on why that matters for popup blockers). */
export function preloadGoogleIdentity(): void {
  if (isCloudSyncConfigured()) void loadGoogleIdentityScript();
}

/** Gets a usable access token, renewing it only when that can be done without ambushing the user
 *  with a window.
 *
 *  `allowWindow` is the single gate on whether this function may talk to GIS at all, and it must
 *  be set only by a caller that is itself still inside a real user gesture — a "Sync Now",
 *  "Connect", or "Delete Cloud Data" click. Everything else (the app-launch sync, the back-online
 *  retry) leaves it off. The reason is that *every* GIS token path opens a genuine browser window,
 *  including `prompt: 'none'`, which opens one and self-closes it (see `requestAccessToken`).
 *  There is no invisible renewal to fall back on, so the honest choices for a background caller
 *  are "flash a window at someone who didn't ask" or "don't renew". This picks the second: with no
 *  usable cached token and no gesture, it throws `refresh_required` without calling GIS, and the
 *  next thing the user clicks quietly puts the session back. That failure is *not* a signed-out
 *  session and callers must not present it as one.
 *
 *  `forceRefresh` skips the cache entirely — used for the one-retry-on-401 path, since a 401 means
 *  the token Drive just rejected is no longer trustworthy even if our clock thinks it's still
 *  valid.
 *
 *  Escalation to a visible consent screen happens only when `allowInteractiveFallback` is also set
 *  and the silent attempt failed with `'interaction_required'` or `'cancelled'` — both meaning
 *  Google couldn't complete it without the user present. Empirically (verified against the live
 *  GIS script, not just its docs), a `prompt: 'none'` request with no existing Google session
 *  doesn't always surface as a clean `interaction_required` token-response error — GIS can instead
 *  open its popup and immediately self-close it, which fires `error_callback`'s `popup_closed`
 *  path, reported here as `'cancelled'`. That's safe to treat the same as `interaction_required`
 *  only because this branch runs solely after a silent attempt: a real user can't have dismissed a
 *  popup they were never shown. `popup_blocked` is never escalated — the browser refused to open a
 *  window for this call, and a second attempt from the same context hits the same wall. */
async function getAccessToken(options: {
  allowWindow: boolean;
  forceRefresh?: boolean;
  allowInteractiveFallback?: boolean;
}): Promise<string> {
  if (!CLIENT_ID) throw new SyncNotConfiguredError();

  // Gesture-bound callers get the wider margin: they can afford to renew a nearly-spent token up
  // front, inside the gesture they already have. Background callers get the narrow one, so a token
  // is spent right down to the wire rather than being declared unusable while it still works.
  const margin = options.allowWindow ? TOKEN_RENEW_MARGIN_MS : TOKEN_USABLE_MARGIN_MS;
  const isUsable = (token: AccessTokenResult | null, requiredMargin: number): token is AccessTokenResult =>
    token !== null && token.expiresAt - requiredMargin > Date.now();

  const cached = cachedToken;
  if (!options.forceRefresh && isUsable(cached, margin)) return cached.accessToken;

  if (!options.allowWindow) {
    throw new SyncAuthError(
      'Cloud Sync is paused until your next sync.',
      'refresh_required',
    );
  }

  try {
    const result = await requestAccessToken(CLIENT_ID, { interactive: false });
    setCachedToken(result);
    return result.accessToken;
  } catch (error) {
    if (
      options.allowInteractiveFallback &&
      error instanceof SyncAuthError &&
      (error.reason === 'interaction_required' || error.reason === 'cancelled')
    ) {
      const result = await requestAccessToken(CLIENT_ID, { interactive: true });
      setCachedToken(result);
      return result.accessToken;
    }
    // A renewal that failed early — the token was inside the wide gesture margin but still has
    // real life left — is not a reason to fail the sync. Use what's already in hand and let the
    // 401 path deal with it if it does run out mid-flight.
    const stillCached = cachedToken;
    if (!options.forceRefresh && isUsable(stillCached, TOKEN_USABLE_MARGIN_MS)) {
      return stillCached.accessToken;
    }
    throw error;
  }
}

/** Wraps a Drive call so a token that expired mid-sync (large syncs can outlast the 1hr access
 *  token) triggers exactly one refresh-and-retry instead of failing the whole sync.
 *
 *  `allowInteractiveFallback` doubles as the "this call is inside a user gesture" signal, so it
 *  also decides whether the refresh is even allowed to open a window (see `getAccessToken`). */
async function withTokenRetry<T>(
  fn: (token: string) => Promise<T>,
  options: { allowInteractiveFallback?: boolean } = {},
): Promise<T> {
  const allowWindow = Boolean(options.allowInteractiveFallback);
  const token = await getAccessToken({
    allowWindow,
    allowInteractiveFallback: options.allowInteractiveFallback,
  });
  try {
    return await fn(token);
  } catch (error) {
    if (error instanceof DriveApiError && error.status === 401) {
      // Drive just rejected this token, so it's dead no matter what its recorded expiry claims —
      // drop it from memory *and* localStorage. Leaving it persisted meant the next page load
      // restored a token already known to be rejected and failed the startup sync all over again.
      cachedToken = null;
      clearPersistedToken();
      const refreshedToken = await getAccessToken({
        allowWindow,
        allowInteractiveFallback: options.allowInteractiveFallback,
        forceRefresh: true,
      });
      return await fn(refreshedToken);
    }
    throw error;
  }
}

/** Interactive first-time (or re-)connection: shows the Google account/consent chooser, stores
 *  the "connected" flag and profile, then runs an initial two-way sync so this device and the
 *  cloud converge immediately rather than waiting for the next scheduled sync. */
export async function connect(): Promise<SyncSummary> {
  if (!CLIENT_ID) throw new SyncNotConfiguredError();

  const result = await requestAccessToken(CLIENT_ID, { interactive: true });
  setCachedToken(result);

  const profile = await fetchUserProfile(result.accessToken);
  persistConnected(profile);

  return syncNow({ allowInteractiveFallback: true });
}

export async function disconnect(): Promise<void> {
  if (cachedToken) await revokeAccessToken(cachedToken.accessToken);
  clearConnected();
}

/** Testing-only: permanently deletes `flashcards_sync.json` from the appDataFolder, but — unlike
 *  `disconnect` — leaves this device's "connected" state, token, and profile untouched. The next
 *  `syncNow` on ANY device sharing this Drive account starts from an empty remote payload and
 *  re-creates the file from whichever device syncs first, exactly like a first-ever sync. Not part
 *  of the normal Cloud Sync flow; exists purely so development/QA can exercise the "no remote file
 *  yet" path on demand without actually revoking Drive access. */
export async function deleteCloudSyncData(): Promise<void> {
  if (!CLIENT_ID) throw new SyncNotConfiguredError();
  if (!isGoogleConnected()) throw new SyncAuthError('Google Drive is not connected.');
  if (!navigator.onLine) throw new SyncOfflineError();

  try {
    await withTokenRetry(async (token) => {
      const fileId = remoteFileId ?? (await findSyncFileId(token));
      if (!fileId) return;
      await deleteSyncFile(token, fileId);
      remoteFileId = null;
    }, { allowInteractiveFallback: true });

    localStorage.removeItem(STORAGE_KEYS.lastSyncedAt);
  } catch (error) {
    if (error instanceof SyncAuthError || error instanceof SyncNotConfiguredError) throw error;
    if (error instanceof DriveApiError && (error.status === 401 || error.status === 403)) {
      throw new SyncAuthError();
    }
    throw new SyncOfflineError();
  }
}

async function fetchRemotePayload(token: string): Promise<SyncPayload> {
  const fileId = remoteFileId ?? (await findSyncFileId(token));
  remoteFileId = fileId;
  if (!fileId) return emptySyncPayload();

  try {
    return await downloadSyncFile<SyncPayload>(token, fileId);
  } catch (error) {
    // The cached file id can go stale if the file was removed out-of-band (e.g. the user revoked
    // Drive access elsewhere and reconnected). Drop it so the next sync re-resolves it by name
    // instead of retrying the same dead id forever.
    if (error instanceof DriveApiError && error.status === 404) remoteFileId = null;
    throw error;
  }
}

async function uploadPayload(token: string, payload: SyncPayload): Promise<void> {
  try {
    if (remoteFileId) {
      await updateSyncFile(token, remoteFileId, payload);
    } else {
      remoteFileId = await createSyncFile(token, payload);
    }
  } catch (error) {
    if (error instanceof DriveApiError && error.status === 404) remoteFileId = null;
    throw error;
  }
}

/**
 * Runs one full two-way sync: fetches local + remote state, resolves every deck/topic/tag/
 * quiz-history record by `id` with last-write-wins on `updatedAt` (see `mergeById`), every card the
 * same way except `studyCount`, which takes whichever side counted more (see `mergeCards`), and
 * every daily-stat row by `date` with the same max-count approach (see `mergeDailyStats`), writes
 * the losing side's records to wherever they lost, collapses any same-named deck/topic/tag or
 * same-front-text card duplicates the id-based merge couldn't catch (see `deduplicateLocalData`),
 * and uploads the result as the new `flashcards_sync.json`. Local IndexedDB is fully updated —
 * merge, then dedup — before anything is uploaded, so a failure during the upload step never loses
 * data: it just means the already-settled local state gets re-pushed on the next successful sync.
 *
 * `allowInteractiveFallback` (default off) must be set only when this call is itself running
 * inside a user gesture — a "Sync Now" or "Connect" click. It carries two permissions at once: it
 * lets the call renew an expired token at all (any renewal opens a window — see `getAccessToken`),
 * and it lets a silent renewal that comes back `interaction_required` escalate to one consent
 * screen in the same call rather than making the user click twice.
 *
 * Background callers (app-launch sync, the back-online retry) leave it off, and as a result a
 * background sync whose token has run out does not renew: it fails fast with a
 * `refresh_required` `SyncAuthError`, having opened nothing and shown nothing. That is the
 * intended, quiet outcome — local data is untouched, and the user's next sync click restores the
 * session. A background sync whose token is still good needs no GIS call at all and syncs
 * normally, which is the overwhelmingly common case within a token's hour.
 */
export async function syncNow(options: { allowInteractiveFallback?: boolean } = {}): Promise<SyncSummary> {
  if (!CLIENT_ID) throw new SyncNotConfiguredError();
  if (!isGoogleConnected()) throw new SyncAuthError('Google Drive is not connected.');
  if (!navigator.onLine) throw new SyncOfflineError();

  try {
    const [localDecks, localTopics, localTags, localCards, localQuizHistory, localDailyStats, localSettings] =
      await Promise.all([
        deckRepository.getAllIncludingDeleted(),
        topicRepository.getAllIncludingDeleted(),
        tagRepository.getAllIncludingDeleted(),
        cardRepository.getAllIncludingDeleted(),
        aiQuizResultRepository.getAll(),
        dailyStatRepository.getAll(),
        settingsRepository.get(),
      ]);
    const localSyncCards = await Promise.all(localCards.map(cardToSyncCard));

    const remote = await withTokenRetry((token) => fetchRemotePayload(token), options);

    const deckResult = mergeById(localDecks, remote.decks);
    const topicResult = mergeById(localTopics, remote.topics);
    const tagResult = mergeById(localTags, remote.tags);
    // Whole-record last-write-wins for every card field except `studyCount`, which is resolved by
    // `Math.max` instead so one device's study reps never get silently discarded by the other's
    // more-recent edit winning the rest of the record (see `mergeCards`'s own doc comment).
    const cardResult = mergeCards<SyncCard>(localSyncCards, remote.cards);
    // Quiz results have no edit UI, so `updatedAt` normally just mirrors `createdAt` — but reusing
    // `mergeById` still resolves the (rare) case of an id somehow colliding across devices the same
    // last-write-wins way as every other entity, rather than needing a bespoke merge.
    const quizResult = mergeById<AiQuizResult>(localQuizHistory, remote.quizHistory ?? []);
    const dailyStatResult = mergeDailyStats<DailyStat>(localDailyStats, remote.dailyStats ?? []);
    const settingsResult = mergeSingleton<AppSettings>(localSettings, remote.settings);

    await Promise.all([
      deckRepository.bulkPut(deckResult.toApplyLocally),
      topicRepository.bulkPut(topicResult.toApplyLocally),
      tagRepository.bulkPut(tagResult.toApplyLocally),
      (async () => {
        const cardsToApply = await Promise.all(cardResult.toApplyLocally.map(syncCardToCard));
        await cardRepository.bulkPut(cardsToApply);
      })(),
      aiQuizResultRepository.bulkPut(quizResult.toApplyLocally),
      dailyStatRepository.bulkPut(dailyStatResult.toApplyLocally),
      settingsResult.toApplyLocally ? settingsRepository.replace(settingsResult.merged) : Promise.resolve(),
    ]);

    // Two devices that independently created the same-named deck/topic/tag, or the same default
    // card (e.g. both seeded a "Grammar" deck, or both got the same starter card), end up as two
    // different ids, which the id-based merge above can't detect — it only ever reconciles records
    // that already share an id. Local IndexedDB now holds the full local-∪-remote union from the
    // merge, so this is the first point where such cross-device duplicates are actually visible to
    // collapse.
    await deduplicateLocalData();

    const [dedupedDecks, dedupedTopics, dedupedTags, dedupedCards, dedupedQuizHistory, dedupedDailyStats] =
      await Promise.all([
        deckRepository.getAllIncludingDeleted(),
        topicRepository.getAllIncludingDeleted(),
        tagRepository.getAllIncludingDeleted(),
        cardRepository.getAllIncludingDeleted(),
        aiQuizResultRepository.getAll(),
        dailyStatRepository.getAll(),
      ]);
    const dedupedSyncCards = await Promise.all(dedupedCards.map(cardToSyncCard));

    const syncedAt = Date.now();
    const payload: SyncPayload = {
      version: SYNC_PAYLOAD_VERSION,
      updatedAt: syncedAt,
      decks: dedupedDecks,
      topics: dedupedTopics,
      tags: dedupedTags,
      cards: dedupedSyncCards,
      quizHistory: dedupedQuizHistory,
      dailyStats: dedupedDailyStats,
      settings: settingsResult.merged,
    };
    await withTokenRetry((token) => uploadPayload(token, payload), options);

    localStorage.setItem(STORAGE_KEYS.lastSyncedAt, String(syncedAt));

    const pulled =
      deckResult.toApplyLocally.length +
      topicResult.toApplyLocally.length +
      tagResult.toApplyLocally.length +
      cardResult.toApplyLocally.length +
      quizResult.toApplyLocally.length +
      dailyStatResult.toApplyLocally.length +
      (settingsResult.toApplyLocally ? 1 : 0);
    const pushed =
      dedupedDecks.length +
      dedupedTopics.length +
      dedupedTags.length +
      dedupedCards.length +
      dedupedQuizHistory.length +
      dedupedDailyStats.length +
      1 - // the settings singleton
      pulled;

    return { pulled, pushed, syncedAt };
  } catch (error) {
    if (error instanceof SyncAuthError || error instanceof SyncNotConfiguredError) throw error;
    if (error instanceof DriveApiError && (error.status === 401 || error.status === 403)) {
      throw new SyncAuthError();
    }
    // Network failure (fetch threw, DriveApiError status 0) or any other Drive error — local data
    // is untouched, so this degrades to local-only mode per the offline-handling requirement.
    throw new SyncOfflineError();
  }
}
