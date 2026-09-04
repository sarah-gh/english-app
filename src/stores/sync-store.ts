import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as googleDriveSync from '@/services/sync/google-drive-sync';
import { type GoogleProfile } from '@/services/sync/drive-api';
import { SyncAuthError, SyncNotConfiguredError, SyncOfflineError } from '@/services/sync/types';
import { useAnalyticsStore } from '@/stores/analytics-store';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';

function messageForError(error: unknown): string {
  // `refresh_required` is not a failure the user needs to read about: the session is intact, the
  // sync simply declined to open a sign-in window nobody asked for (see `getAccessToken`). It's
  // surfaced through `needsRefresh` as a quiet prompt instead of an error line.
  if (error instanceof SyncAuthError) return error.reason === 'refresh_required' ? '' : error.message;
  if (error instanceof SyncOfflineError) return 'Sync failed. Changes saved locally.';
  if (error instanceof SyncNotConfiguredError) return error.message;
  return 'Sync failed. Changes saved locally.';
}

export const useSyncStore = defineStore('sync', () => {
  const isConfigured = ref(googleDriveSync.isCloudSyncConfigured());
  const isConnected = ref(googleDriveSync.isGoogleConnected());
  const profile = ref<GoogleProfile | null>(googleDriveSync.getStoredProfile());
  const lastSyncedAt = ref<number | null>(googleDriveSync.getLastSyncedAt());
  const isConnecting = ref(false);
  const isSyncing = ref(false);
  const isDeletingCloudData = ref(false);
  const lastError = ref('');
  /** True when the last sync failed specifically because Google auth needs the user present
   *  again (an expired/revoked session, or a browser-blocked background refresh) — distinct from
   *  a generic/offline failure so the UI can offer a direct "Reconnect" action instead of just an
   *  error message. Cleared on every successful sync/connect and on disconnect. */
  const needsReauth = ref(false);
  /** True when a background sync stopped because its access token ran out and renewing one would
   *  have meant opening a sign-in window outside a user gesture. Deliberately distinct from
   *  `needsReauth`: nothing is actually wrong with the Google session, so the UI shows a neutral
   *  "tap Sync Now to resume" prompt rather than the alarming "Sign-in expired". Any user-initiated
   *  sync clears it, usually with no visible sign-in at all. */
  const needsRefresh = ref(false);
  const isOffline = ref(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  let onlineRetryArmed = false;

  /** Routes an auth failure to the right UI state — see `needsRefresh`'s doc comment for why a
   *  paused session must never be shown as an expired sign-in. */
  function applyAuthFailure(error: unknown): void {
    if (!(error instanceof SyncAuthError)) return;
    if (error.reason === 'refresh_required') needsRefresh.value = true;
    else needsReauth.value = true;
  }

  /** Every store here caches Dexie reads in memory, so a sync that changed IndexedDB behind their
   *  back needs an explicit refetch or the UI keeps showing stale/deleted records — including the
   *  AI Quiz History list on the Profile page, now that it syncs too. */
  async function refreshEntityStores(): Promise<void> {
    await Promise.all([
      useCardStore().fetchAll(),
      useDeckStore().fetchAll(),
      useTopicStore().fetchAll(),
      useTagStore().fetchAll(),
      useAnalyticsStore().fetchAll(),
    ]);
  }

  function armOnlineRetry(): void {
    if (onlineRetryArmed || typeof window === 'undefined') return;
    onlineRetryArmed = true;
    window.addEventListener(
      'online',
      () => {
        onlineRetryArmed = false;
        isOffline.value = false;
        if (isConnected.value) void syncNow();
      },
      { once: true },
    );
  }

  async function connect(): Promise<void> {
    if (!isConfigured.value || isConnecting.value) return;
    isConnecting.value = true;
    lastError.value = '';
    needsReauth.value = false;
    needsRefresh.value = false;
    try {
      await googleDriveSync.connect();
    } catch (error) {
      // `googleDriveSync.connect()` persists the connected flag to localStorage as soon as
      // OAuth succeeds, then immediately runs the first sync — so a failure here can mean
      // either "never authorized" (cancelled popup, bad client id) or "authorized fine, but
      // that first sync itself failed" (e.g. a network drop right after the consent screen
      // closes). Re-reading `isGoogleConnected()` below (rather than only setting it on the
      // try's success path) is what tells those two cases apart, so a successful sign-in never
      // gets shown as "not connected" just because the sync after it hiccuped.
      // Deliberately no `applyAuthFailure` here: a cancelled or blocked *interactive* sign-in is
      // already fully described by `lastError`, and flipping `needsReauth` on top of it would
      // show "Sign-in expired — reconnect" to someone who has never connected in the first place.
      lastError.value = messageForError(error);
      if (error instanceof SyncOfflineError) armOnlineRetry();
    } finally {
      isConnected.value = googleDriveSync.isGoogleConnected();
      profile.value = googleDriveSync.getStoredProfile();
      lastSyncedAt.value = googleDriveSync.getLastSyncedAt();
      isConnecting.value = false;
    }
    if (isConnected.value) await refreshEntityStores();
  }

  async function disconnect(): Promise<void> {
    await googleDriveSync.disconnect();
    isConnected.value = false;
    profile.value = null;
    lastSyncedAt.value = null;
    lastError.value = '';
    needsReauth.value = false;
    needsRefresh.value = false;
  }

  /** `userInitiated` must be set only from a direct user action (the "Sync Now" button) — it's
   *  what lets `googleDriveSync.syncNow` fall through to one interactive popup if a silent
   *  refresh comes back needing the user present, instead of just failing. Background callers
   *  (`initOnStartup`, the back-online retry below) leave it unset, so a stale session there
   *  surfaces as `needsReauth` for the user to act on — never an unrequested popup. */
  async function syncNow(options: { userInitiated?: boolean } = {}): Promise<void> {
    if (!isConnected.value || isSyncing.value) return;
    isSyncing.value = true;
    lastError.value = '';
    needsReauth.value = false;
    needsRefresh.value = false;
    try {
      const summary = await googleDriveSync.syncNow({ allowInteractiveFallback: options.userInitiated });
      lastSyncedAt.value = summary.syncedAt;
      await refreshEntityStores();
    } catch (error) {
      lastError.value = messageForError(error);
      applyAuthFailure(error);
      if (error instanceof SyncOfflineError) armOnlineRetry();
    } finally {
      isSyncing.value = false;
    }
  }

  /** Testing-only — see `googleDriveSync.deleteCloudSyncData`'s own doc comment. Leaves
   *  `isConnected`/`profile` untouched; only `lastSyncedAt` resets, since the backup file itself
   *  (not this device's connection) is what's gone. */
  async function deleteCloudData(): Promise<void> {
    isDeletingCloudData.value = true;
    lastError.value = '';
    needsReauth.value = false;
    needsRefresh.value = false;
    try {
      await googleDriveSync.deleteCloudSyncData();
      lastSyncedAt.value = googleDriveSync.getLastSyncedAt();
    } catch (error) {
      lastError.value = messageForError(error);
      applyAuthFailure(error);
      if (error instanceof SyncOfflineError) armOnlineRetry();
    } finally {
      isDeletingCloudData.value = false;
    }
  }

  /** Called once from `App.vue` on launch: primes the GIS script (see
   *  `preloadGoogleIdentity`'s doc comment), and if already connected, performs the silent
   *  token refresh + background sync described by the Persistent Login requirement. */
  function initOnStartup(): void {
    googleDriveSync.preloadGoogleIdentity();
    if (isConnected.value) void syncNow();

    // Another tab signing out, signing in, or completing a sync changes state this tab is holding
    // in memory. Without this, a tab left open next to one where the user disconnected keeps
    // rendering a connected profile card and a "Sync Now" button that can no longer work.
    googleDriveSync.onSessionChanged(() => {
      const wasConnected = isConnected.value;
      isConnected.value = googleDriveSync.isGoogleConnected();
      profile.value = googleDriveSync.getStoredProfile();
      lastSyncedAt.value = googleDriveSync.getLastSyncedAt();
      if (!isConnected.value && wasConnected) {
        lastError.value = '';
        needsReauth.value = false;
        needsRefresh.value = false;
      }
      // A sync that succeeded in another tab used a token this tab can now see too, so whatever
      // paused/expired prompt this tab was showing is stale.
      if (isConnected.value && lastSyncedAt.value) needsRefresh.value = false;
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('offline', () => {
        isOffline.value = true;
      });
      window.addEventListener('online', () => {
        isOffline.value = false;
      });
    }
  }

  return {
    isConfigured,
    isConnected,
    profile,
    lastSyncedAt,
    isConnecting,
    isSyncing,
    isDeletingCloudData,
    lastError,
    needsReauth,
    needsRefresh,
    isOffline,
    connect,
    disconnect,
    syncNow,
    deleteCloudData,
    initOnStartup,
  };
});
