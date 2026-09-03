import { cardToSyncCard, syncCardToCard } from '@/services/sync/card-codec';
import {
  cardRepository,
  deckRepository,
  tagRepository,
  topicRepository,
} from '@/db/repositories';
import { deduplicateLocalData } from '@/services/sync/deduplicate-local-data';
import {
  createSyncFile,
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
import { mergeById } from '@/services/sync/merge';
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
let proactiveRefreshTimer: ReturnType<typeof setTimeout> | null = null;

/** How long before an access token's real expiry to proactively try renewing it — both the
 *  target for `scheduleProactiveRefresh` below and the head start `getAccessToken` gives
 *  user-initiated actions (see `SAFETY_MARGIN_MS`). Also doubles as the "near expiration" cutoff
 *  on reload: a restored token with more than this much life left is reused as-is with zero GIS
 *  calls; only one with less goes through a (background, best-effort) refresh. */
const REFRESH_LEAD_MS = 10 * 60_000;

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
  scheduleProactiveRefresh(result.expiresAt);
}

/** Opportunistically renews the token ~10 minutes ahead of expiry, purely as a background head
 *  start — NOT a substitute for the on-demand refresh in `getAccessToken`, which remains the real
 *  safety net. GIS has no hidden-iframe silent-renew mode (see `requestAccessToken`'s doc
 *  comment): even a `prompt: 'none'` call opens an actual, self-closing popup, and browsers only
 *  allow `window.open` calls that originate from a user gesture. A `setTimeout` firing on its own
 *  is never a user gesture, so this frequently comes back `popup_blocked` in browsers with strict
 *  popup policies — that failure is expected and silently swallowed here rather than surfaced to
 *  the user. Where it does succeed (this varies by browser), the user simply never sees an
 *  expired token; where it doesn't, the next actual sync's silent-then-interactive fallback still
 *  runs exactly as it did before this existed. */
function scheduleProactiveRefresh(expiresAt: number): void {
  if (proactiveRefreshTimer) clearTimeout(proactiveRefreshTimer);
  if (!CLIENT_ID) return;

  const delay = Math.max(expiresAt - REFRESH_LEAD_MS - Date.now(), 5_000);
  proactiveRefreshTimer = setTimeout(() => {
    void requestAccessToken(CLIENT_ID!, { interactive: false })
      .then(setCachedToken)
      .catch(() => {
        // Best-effort only — see the doc comment above.
      });
  }, delay);
}

function clearProactiveRefresh(): void {
  if (proactiveRefreshTimer) {
    clearTimeout(proactiveRefreshTimer);
    proactiveRefreshTimer = null;
  }
}

// Hydrate from localStorage as soon as this module loads, so `initOnStartup`'s background sync
// (and anything else that runs before a user gesture happens) finds a usable cached token instead
// of unconditionally hitting a silent GIS request that has no way to succeed without one.
cachedToken = loadPersistedToken();
if (cachedToken) scheduleProactiveRefresh(cachedToken.expiresAt);

/** Catches up a token that went stale while the tab was backgrounded (e.g. the laptop slept
 *  through the 1hr lifetime) — JS timers don't fire while a tab is hidden, so
 *  `scheduleProactiveRefresh`'s `setTimeout` can't. Same best-effort, silent-only contract as
 *  that function; this just gives it another chance to run as soon as the tab is back, instead of
 *  waiting for the next sync to discover the 401 the hard way. */
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !CLIENT_ID || !isGoogleConnected()) return;
    void getAccessToken({ interactive: false }).catch(() => {});
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
  clearProactiveRefresh();
  clearPersistedToken();
}

/** Preloads the GIS script — call this as soon as the Cloud Sync UI mounts so the later
 *  user-initiated "Connect" click can request a token with no async gap before it (see
 *  `loadGoogleIdentityScript`'s doc comment on why that matters for popup blockers). */
export function preloadGoogleIdentity(): void {
  if (isCloudSyncConfigured()) void loadGoogleIdentityScript();
}

/** Gets a usable access token, refreshing silently (`prompt: 'none'`) when the cached one is
 *  missing/near expiry. `forceRefresh` skips the cache entirely — used for the one-retry-on-401
 *  path, since a 401 means the token Drive just rejected is no longer trustworthy even if our
 *  clock thinks it's still valid.
 *
 *  `allowInteractiveFallback` is the only thing that ever pops a visible sign-in window from this
 *  function, and only when the *silent* attempt (`!options.interactive`) fails with `reason`
 *  `'interaction_required'` or `'cancelled'` — both mean Google couldn't complete it without the
 *  user present. Empirically (verified against the live GIS script, not just its docs), a
 *  `prompt: 'none'` request with no existing Google session doesn't always surface as a clean
 *  `interaction_required` token-response error — GIS can instead open its popup and immediately
 *  self-close it, which fires `error_callback`'s `popup_closed` path, reported here as
 *  `'cancelled'`. That's harmless to treat the same as `interaction_required` only because this
 *  branch only ever runs for the silent attempt: a real user can't have manually dismissed a
 *  popup they were never silently shown one to dismiss. `popup_blocked` is the one reason that's
 *  never retried — it means the browser refused to open a window at all for *this* call, and an
 *  interactive attempt starting from the same non-gesture context would hit the same wall. The
 *  caller is responsible for only setting `allowInteractiveFallback` when the call is itself
 *  still running inside a user gesture (see `syncNow`'s `allowInteractiveFallback` option). */
async function getAccessToken(options: {
  interactive: boolean;
  forceRefresh?: boolean;
  allowInteractiveFallback?: boolean;
}): Promise<string> {
  if (!CLIENT_ID) throw new SyncNotConfiguredError();

  // Wider than the strict minimum needed to avoid a mid-call expiry: a user-initiated action
  // (Sync Now, Connect) that finds the cached token inside this window renews it silently as
  // part of the same call, still within the user's gesture, rather than waiting to hit a 401
  // partway through and needing the `withTokenRetry` retry-and-continue path.
  const SAFETY_MARGIN_MS = REFRESH_LEAD_MS;
  if (!options.forceRefresh && cachedToken && cachedToken.expiresAt - SAFETY_MARGIN_MS > Date.now()) {
    return cachedToken.accessToken;
  }

  try {
    const result = await requestAccessToken(CLIENT_ID, { interactive: options.interactive });
    setCachedToken(result);
    return result.accessToken;
  } catch (error) {
    if (
      !options.interactive &&
      options.allowInteractiveFallback &&
      error instanceof SyncAuthError &&
      (error.reason === 'interaction_required' || error.reason === 'cancelled')
    ) {
      const result = await requestAccessToken(CLIENT_ID, { interactive: true });
      setCachedToken(result);
      return result.accessToken;
    }
    throw error;
  }
}

/** Wraps a Drive call so a token that expired mid-sync (large syncs can outlast the 1hr access
 *  token) triggers exactly one silent refresh-and-retry instead of failing the whole sync. */
async function withTokenRetry<T>(
  fn: (token: string) => Promise<T>,
  options: { allowInteractiveFallback?: boolean } = {},
): Promise<T> {
  const token = await getAccessToken({ interactive: false, allowInteractiveFallback: options.allowInteractiveFallback });
  try {
    return await fn(token);
  } catch (error) {
    if (error instanceof DriveApiError && error.status === 401) {
      const refreshedToken = await getAccessToken({ interactive: false, forceRefresh: true });
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
 * Runs one full two-way sync: fetches local + remote state, resolves every deck/topic/tag/card by
 * `id` with last-write-wins on `updatedAt` (see `mergeById`), writes the losing side's records to
 * wherever they lost, collapses any same-named deck/topic/tag duplicates the id-based merge
 * couldn't catch (see `deduplicateLocalData`), and uploads the result as the new
 * `flashcards_sync.json`. Local IndexedDB is fully updated — merge, then dedup — before anything is
 * uploaded, so a failure during the upload step never loses data: it just means the already-settled
 * local state gets re-pushed on the next successful sync.
 *
 * `allowInteractiveFallback` (default off) should be set only when this call is itself running
 * inside a user gesture — a "Sync Now" or "Connect" click. It lets a silent token refresh that
 * comes back `interaction_required` fall through to one interactive popup in the same call,
 * rather than making the user click twice. Background callers (app-launch sync, the
 * back-online retry) must leave it off: an unrequested popup from a timer is exactly what silent
 * refresh exists to avoid, and browsers block it anyway since it's not gesture-triggered — the
 * silent attempt still runs either way, so a valid existing session refreshes with zero UI
 * regardless of this flag.
 */
export async function syncNow(options: { allowInteractiveFallback?: boolean } = {}): Promise<SyncSummary> {
  if (!CLIENT_ID) throw new SyncNotConfiguredError();
  if (!isGoogleConnected()) throw new SyncAuthError('Google Drive is not connected.');
  if (!navigator.onLine) throw new SyncOfflineError();

  try {
    const [localDecks, localTopics, localTags, localCards] = await Promise.all([
      deckRepository.getAllIncludingDeleted(),
      topicRepository.getAllIncludingDeleted(),
      tagRepository.getAllIncludingDeleted(),
      cardRepository.getAllIncludingDeleted(),
    ]);
    const localSyncCards = await Promise.all(localCards.map(cardToSyncCard));

    const remote = await withTokenRetry((token) => fetchRemotePayload(token), options);

    const deckResult = mergeById(localDecks, remote.decks);
    const topicResult = mergeById(localTopics, remote.topics);
    const tagResult = mergeById(localTags, remote.tags);
    const cardResult = mergeById<SyncCard>(localSyncCards, remote.cards);

    await Promise.all([
      deckRepository.bulkPut(deckResult.toApplyLocally),
      topicRepository.bulkPut(topicResult.toApplyLocally),
      tagRepository.bulkPut(tagResult.toApplyLocally),
      (async () => {
        const cardsToApply = await Promise.all(cardResult.toApplyLocally.map(syncCardToCard));
        await cardRepository.bulkPut(cardsToApply);
      })(),
    ]);

    // Two devices that independently created the same-named deck/topic/tag (e.g. both seeded a
    // default "Grammar" deck) end up as two different ids, which the id-based merge above can't
    // detect — it only ever reconciles records that already share an id. Local IndexedDB now
    // holds the full local-∪-remote union from the merge, so this is the first point where such
    // cross-device duplicates are actually visible to collapse.
    await deduplicateLocalData();

    const [dedupedDecks, dedupedTopics, dedupedTags, dedupedCards] = await Promise.all([
      deckRepository.getAllIncludingDeleted(),
      topicRepository.getAllIncludingDeleted(),
      tagRepository.getAllIncludingDeleted(),
      cardRepository.getAllIncludingDeleted(),
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
    };
    await withTokenRetry((token) => uploadPayload(token, payload), options);

    localStorage.setItem(STORAGE_KEYS.lastSyncedAt, String(syncedAt));

    const pulled =
      deckResult.toApplyLocally.length +
      topicResult.toApplyLocally.length +
      tagResult.toApplyLocally.length +
      cardResult.toApplyLocally.length;
    const pushed =
      dedupedDecks.length + dedupedTopics.length + dedupedTags.length + dedupedCards.length - pulled;

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
