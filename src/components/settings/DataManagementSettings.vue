<script setup lang="ts">
import { ref } from 'vue';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { exportBackup } from '@/services/backup/exporter';
import { BackupImportError, importBackup, type ImportSummary } from '@/services/backup/importer';
import { clearAllData } from '@/services/data/reset-data';
import { useAnalyticsStore } from '@/stores/analytics-store';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';

const settingsStore = useSettingsStore();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const analyticsStore = useAnalyticsStore();

// --- Backup ---
const isExporting = ref(false);
const isImporting = ref(false);
const importError = ref('');
const importSummary = ref<ImportSummary | null>(null);
const fileInput = ref<HTMLInputElement>();

async function handleExport() {
  isExporting.value = true;
  try {
    await exportBackup();
  } finally {
    isExporting.value = false;
  }
}

function triggerImportPicker() {
  fileInput.value?.click();
}

async function refreshStores() {
  await Promise.all([cardStore.fetchAll(), deckStore.fetchAll(), tagStore.fetchAll()]);
}

async function handleFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  importError.value = '';
  importSummary.value = null;
  isImporting.value = true;
  try {
    const summary = await importBackup(file);
    await refreshStores();
    importSummary.value = summary;
  } catch (error) {
    importError.value =
      error instanceof BackupImportError
        ? error.message
        : 'Import failed. Please check the file and try again.';
  } finally {
    isImporting.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

// --- Clear all data ---
const isConfirmingClear = ref(false);

async function handleClearAll() {
  await clearAllData();
  await Promise.all([
    cardStore.fetchAll(),
    deckStore.fetchAll(),
    tagStore.fetchAll(),
    settingsStore.fetchSettings(),
    analyticsStore.fetchAll(),
  ]);
  isConfirmingClear.value = false;
}
</script>

<template>
  <BaseCard class="mb-6">
    <h2 class="mb-1 text-sm font-semibold text-text">Backup &amp; Data</h2>
    <p class="mb-4 text-xs text-text/50">
      Export everything into a single .zip file, or import one to restore or merge data on this or
      another device.
    </p>

    <div class="mb-3 flex flex-wrap gap-3">
      <BaseButton
        variant="secondary"
        size="sm"
        :loading="isExporting"
        @click="handleExport"
      >
        <AppIcon
          v-if="!isExporting"
          icon-name="DocumentDownload"
          :size="14"
        />
        {{ isExporting ? 'Exporting…' : 'Export Backup (.zip)' }}
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="sm"
        :loading="isImporting"
        @click="triggerImportPicker"
      >
        <AppIcon
          v-if="!isImporting"
          icon-name="DocumentUpload"
          :size="14"
        />
        {{ isImporting ? 'Importing…' : 'Import Backup (.zip)' }}
      </BaseButton>
      <input
        ref="fileInput"
        type="file"
        accept=".zip"
        class="hidden"
        @change="handleFileSelected"
      />
    </div>

    <p
      v-if="importSummary"
      class="text-xs font-medium text-text/70"
    >
      Imported {{ importSummary.decks }} deck(s), {{ importSummary.topics }} topic(s),
      {{ importSummary.tags }} tag(s), {{ importSummary.cards }} card(s).
    </p>
    <p
      v-if="importError"
      class="flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ importError }}
    </p>

    <hr class="my-4 border-text/10" />

    <p class="mb-3 text-xs text-text/50">
      Bulk-create new cards from a spreadsheet instead of a backup file — useful for adding a
      batch of vocabulary, grammar, or idiom cards at once.
    </p>
    <BaseButton
      variant="secondary"
      size="sm"
      to="/cards/import"
    >
      Import Cards (Excel)
    </BaseButton>
  </BaseCard>

  <BaseCard>
    <h2 class="mb-1 text-sm font-semibold text-text">Danger Zone</h2>
    <p class="mb-3 text-xs text-text/50">
      Permanently deletes every deck, card, and tag on this device, and resets your settings. This
      can't be undone.
    </p>
    <BaseButton
      variant="primary"
      danger
      size="sm"
      @click="isConfirmingClear = true"
    >
      <AppIcon
        icon-name="Trash"
        :size="14"
      />
      Clear All Data
    </BaseButton>
  </BaseCard>

  <ConfirmDialog
    v-if="isConfirmingClear"
    title="Clear all data?"
    message="This permanently deletes every deck, card, and tag on this device, and resets your settings. This can't be undone."
    confirm-label="Clear Everything"
    variant="danger"
    @confirm="handleClearAll"
    @cancel="isConfirmingClear = false"
  />
</template>
