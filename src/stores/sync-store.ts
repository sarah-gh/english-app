import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as googleDriveSync from '@/services/sync/google-drive-sync';
import { type GoogleProfile } from '@/services/sync/drive-api';
import { SyncAuthError, SyncNotConfiguredError, SyncOfflineError } from '@/services/sync/types';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';

function messageForError(error: unknown): string {
  if (error instanceof SyncOfflineError) return 'Sync failed. Changes saved locally.';
  if (error instanceof SyncAuthError) return error.message;
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
  const lastError = ref('');
  /** True when the last sync failed specifically because Google auth needs the user present
   *  again (an expired/revoked session, or a browser-blocked background refresh) — distinct from
   *  a generic/offline failure so the UI can offer a direct "Reconnect" action instead of just an
   *  error message. Cleared on every successful sync/connect and on disconnect. */
  const needsReauth = ref(false);
  const isOffline = ref(typeof navigator !== 'undefined' ? !navigator.onLine : false);

  let onlineRetryArmed = false;

  /** Every store here caches Dexie reads in memory, so a sync that changed IndexedDB behind their
   *  back needs an explicit refetch or the UI keeps showing stale/deleted records. */
  async function refreshEntityStores(): Promise<void> {
    await Promise.all([
      useCardStore().fetchAll(),
      useDeckStore().fetchAll(),
      useTopicStore().fetchAll(),
      useTagStore().fetchAll(),
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
    try {
      const summary = await googleDriveSync.syncNow({ allowInteractiveFallback: options.userInitiated });
      lastSyncedAt.value = summary.syncedAt;
      await refreshEntityStores();
    } catch (error) {
      lastError.value = messageForError(error);
      if (error instanceof SyncAuthError) needsReauth.value = true;
      if (error instanceof SyncOfflineError) armOnlineRetry();
    } finally {
      isSyncing.value = false;
    }
  }

  /** Called once from `App.vue` on launch: primes the GIS script (see
   *  `preloadGoogleIdentity`'s doc comment), and if already connected, performs the silent
   *  token refresh + background sync described by the Persistent Login requirement. */
  function initOnStartup(): void {
    googleDriveSync.preloadGoogleIdentity();
    if (isConnected.value) void syncNow();

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
    lastError,
    needsReauth,
    isOffline,
    connect,
    disconnect,
    syncNow,
    initOnStartup,
  };
});
