<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { preloadGoogleIdentity } from '@/services/sync/google-drive-sync';
import { useSyncStore } from '@/stores/sync-store';
import { formatRelativeTime } from '@/utils/date';

const syncStore = useSyncStore();

const nowTick = ref(Date.now());
let tickTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  preloadGoogleIdentity();
  tickTimer = setInterval(() => (nowTick.value = Date.now()), 30_000);
});
onUnmounted(() => clearInterval(tickTimer));

const lastSyncedLabel = computed(() => {
  if (!syncStore.lastSyncedAt) return null;
  return formatRelativeTime(syncStore.lastSyncedAt, nowTick.value);
});

const isConfirmingDisconnect = ref(false);
const isConfirmingDeleteCloudData = ref(false);

async function handleDeleteCloudData() {
  await syncStore.deleteCloudData();
  isConfirmingDeleteCloudData.value = false;
}

// A one-off confirmation for the deliberate "Connect" action, mirroring the "✓ Saved
// successfully" badge AiProviderSettings shows after a save — connecting is important enough
// to deserve the same explicit acknowledgement, on top of the profile card and "Last synced"
// line that appear right after it.
const showConnectedConfirmation = ref(false);
async function handleConnect() {
  await syncStore.connect();
  if (syncStore.isConnected && !syncStore.lastError) {
    showConnectedConfirmation.value = true;
    setTimeout(() => (showConnectedConfirmation.value = false), 3000);
  }
}
</script>

<template>
  <div class="mb-6 rounded-2xl border border-slate-600 bg-card-surface p-4">
    <div class="mb-1 flex items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <AppIcon
          :icon-name="syncStore.isConnected ? 'CloudConnection' : 'CloudCross'"
          :size="18"
          :class="syncStore.isConnected ? 'text-primary' : 'text-card-muted'"
        />
        <h2 class="text-sm font-semibold text-text">Cloud Sync</h2>
      </div>
      <span
        v-if="syncStore.isConnected"
        class="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
      >
        Connected
        <AppIcon icon-name="TickCircle" :size="14" />
      </span>
    </div>
    <p class="mb-4 text-xs text-card-muted">
      Back up and sync your decks, cards, and tags to your personal Google Drive — no account with
      us required. Storage lives in your Drive's private app data, invisible to other apps.
    </p>

    <template v-if="!syncStore.isConfigured">
      <p class="flex items-center gap-1.5 text-xs font-medium text-card-muted">
        <AppIcon
          icon-name="Danger"
          :size="14"
        />
        Cloud Sync isn't configured for this build (missing Google Client ID).
      </p>
    </template>

    <template v-else-if="!syncStore.isConnected">
      <BaseButton
        variant="primary"
        size="sm"
        :loading="syncStore.isConnecting"
        :disabled="syncStore.isOffline"
        @click="handleConnect"
      >
        <AppIcon
          v-if="!syncStore.isConnecting"
          icon-name="CloudConnection"
          :size="14"
        />
        {{ syncStore.isConnecting ? 'Connecting…' : 'Connect Google Drive' }}
      </BaseButton>
      <p
        v-if="syncStore.isOffline"
        class="mt-2 text-xs font-medium text-card-muted"
      >
        You're offline — connect once you're back online.
      </p>
    </template>

    <template v-else>
      <div class="mb-3 flex items-center gap-3 rounded-xl border border-slate-600 p-3">
        <img
          v-if="syncStore.profile?.picture"
          :src="syncStore.profile.picture"
          alt=""
          class="h-9 w-9 shrink-0 rounded-full"
        />
        <AppIcon
          v-else
          icon-name="ProfileCircle"
          :size="36"
          class="shrink-0 text-card-muted"
        />
        <div class="min-w-0 flex-1">
          <p class="truncate text-xs font-medium text-text">
            {{ syncStore.profile?.name ?? syncStore.profile?.email ?? 'Connected' }}
          </p>
          <p
            v-if="syncStore.profile?.name && syncStore.profile?.email"
            class="truncate text-xs text-card-muted"
          >
            {{ syncStore.profile.email }}
          </p>
        </div>
        <AppIcon icon-name="CloudConnection" :size="20" class="shrink-0 text-primary" />
      </div>

      <p class="mb-3 flex items-center gap-2 text-xs text-card-muted">
        <AppIcon
          v-if="!syncStore.isSyncing && lastSyncedLabel"
          icon-name="TickCircle"
          :size="14"
          class="text-primary"
        />
        <template v-if="syncStore.isSyncing">Syncing…</template>
        <template v-else-if="lastSyncedLabel">Last synced: {{ lastSyncedLabel }}</template>
        <template v-else>Not synced yet.</template>
        <span
          v-if="showConnectedConfirmation"
          class="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-background"
        >
          ✓ Connected
        </span>
      </p>

      <div class="flex flex-wrap items-center gap-3">
        <BaseButton
          variant="primary"
          size="sm"
          :loading="syncStore.isSyncing"
          :disabled="syncStore.isOffline"
          @click="() => syncStore.syncNow({ userInitiated: true })"
        >
          <AppIcon
            v-if="!syncStore.isSyncing"
            icon-name="Refresh"
            :size="14"
          />
          {{ syncStore.isSyncing ? 'Syncing…' : 'Sync Now' }}
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          danger
          @click="isConfirmingDisconnect = true"
        >
          <AppIcon icon-name="Logout" :size="14" />
          Disconnect
        </BaseButton>
      </div>

      <p
        v-if="syncStore.isOffline"
        class="mt-3 flex items-center gap-1.5 text-xs font-medium text-card-muted"
      >
        <AppIcon
          icon-name="CloudCross"
          :size="14"
        />
        You're offline — changes are saved locally and will sync automatically once you're back
        online.
      </p>

      <div class="mt-4 rounded-xl border border-dashed border-danger/30 p-3">
        <p class="mb-2 flex items-center gap-1.5 text-xs font-medium text-danger">
          <AppIcon icon-name="Danger" :size="14" />
          Testing Only
        </p>
        <p class="mb-3 text-xs text-card-muted">
          Permanently deletes the synced backup file from Google Drive. This device's local data
          and connection are untouched, but every device sharing this account loses the backup
          until the next sync recreates it.
        </p>
        <BaseButton
          variant="ghost"
          size="sm"
          danger
          :loading="syncStore.isDeletingCloudData"
          :disabled="syncStore.isOffline"
          @click="isConfirmingDeleteCloudData = true"
        >
          <AppIcon v-if="!syncStore.isDeletingCloudData" icon-name="Trash" :size="14" />
          Delete Cloud Sync Data
        </BaseButton>
      </div>
    </template>

    <div
      v-if="syncStore.needsReauth"
      class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-600 bg-background/40 p-3"
    >
      <p class="flex items-center gap-1.5 text-xs font-medium text-text">
        <AppIcon
          icon-name="CloudCross"
          :size="14"
        />
        Sign-in expired — reconnect to keep syncing.
      </p>
      <BaseButton
        variant="ghost"
        size="sm"
        :loading="syncStore.isConnecting"
        @click="handleConnect"
      >
        Reconnect
      </BaseButton>
    </div>
    <div
      v-else-if="syncStore.needsRefresh"
      class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-600 bg-background/40 p-3"
    >
      <p class="flex items-center gap-1.5 text-xs font-medium text-card-muted">
        <AppIcon icon-name="Refresh" :size="14" />
        Sync paused — resume it whenever you're ready.
      </p>
      <BaseButton
        variant="ghost"
        size="sm"
        :loading="syncStore.isSyncing"
        :disabled="syncStore.isOffline"
        @click="() => syncStore.syncNow({ userInitiated: true })"
      >
        Resume
      </BaseButton>
    </div>
    <p
      v-else-if="syncStore.lastError"
      class="mt-3 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <AppIcon
        icon-name="Danger"
        :size="14"
      />
      {{ syncStore.lastError }}
    </p>

    <div
      v-if="isConfirmingDisconnect"
      class="mt-4 rounded-lg border border-danger/30 bg-danger/5 p-3"
    >
      <p class="mb-3 text-xs text-card-muted">
        Disconnect this device from Google Drive? Your data stays on this device and in Drive —
        only automatic syncing stops.
      </p>
      <div class="flex gap-2">
        <BaseButton
          variant="primary"
          danger
          size="sm"
          @click="
            () => {
              syncStore.disconnect();
              isConfirmingDisconnect = false;
            }
          "
        >
          Disconnect
        </BaseButton>
        <BaseButton
          variant="ghost"
          size="sm"
          @click="isConfirmingDisconnect = false"
        >
          Cancel
        </BaseButton>
      </div>
    </div>

    <ConfirmDialog
      v-if="isConfirmingDeleteCloudData"
      title="Delete Cloud Sync Data?"
      message="Are you sure you want to permanently delete all synced backup data from Google Drive?"
      confirm-label="Delete"
      variant="danger"
      @confirm="handleDeleteCloudData"
      @cancel="isConfirmingDeleteCloudData = false"
    />
  </div>
</template>
