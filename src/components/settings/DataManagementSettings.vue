<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BorderedCard from '@/components/common/BorderedCard.vue';
import DuplicateCardBatchModal from '@/components/card/DuplicateCardBatchModal.vue';
import JsonImportPreviewModal from '@/components/import/JsonImportPreviewModal.vue';
import JsonTextImportModal from '@/components/import/JsonTextImportModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useEntityResolver } from '@/composables/useEntityResolver';
import { exportBackup } from '@/services/backup/exporter';
import { BackupImportError, importBackup, type ImportSummary } from '@/services/backup/importer';
import { clearAllData } from '@/services/data/reset-data';
import { exportDataAsJson } from '@/services/export/data-export';
import { useAnalyticsStore } from '@/stores/analytics-store';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import type { CardUpdate, NewCard } from '@/types/card';
import type { DuplicateConflictItem, DuplicateResolutionAction } from '@/types/duplicate-card';
import { resolveBatchDuplicates } from '@/utils/duplicate-cards';
import {
  parseJsonCardImport,
  type JsonImportValidationResult,
} from '@/utils/import/json-card-importer';
import { generateUUID } from '@/utils/uuid';

const settingsStore = useSettingsStore();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
const tagStore = useTagStore();
const analyticsStore = useAnalyticsStore();
const { createBatch } = useEntityResolver();

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

const isExportingJson = ref(false);

async function handleExportJson() {
  isExportingJson.value = true;
  try {
    await exportDataAsJson();
    showToast('Data exported successfully.');
  } finally {
    isExportingJson.value = false;
  }
}

function triggerImportPicker() {
  fileInput.value?.click();
}

async function refreshStores() {
  await Promise.all([
    cardStore.fetchAll(),
    deckStore.fetchAll(),
    topicStore.fetchAll(),
    tagStore.fetchAll(),
  ]);
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

// --- JSON card import ---
const jsonFileInput = ref<HTMLInputElement>();
const isParsingJson = ref(false);
const isImportingJson = ref(false);
const jsonImportError = ref('');
// `shallowRef` (not `ref`) so the parsed cards inside it stay plain objects, never wrapped in
// reactive Proxies, they get handed to IndexedDB as-is on import, and Dexie/structured-clone
// can't clone a Proxy (the same DataCloneError pitfall documented in the quiz session store).
const jsonImportResult = shallowRef<JsonImportValidationResult | null>(null);
// Populated once the user resolves any duplicate conflicts (see `handleConflictsResolved`);
// reset alongside `jsonImportResult` whenever a new file/paste is parsed or the import is cancelled.
const duplicateResolutions = ref<Map<number, DuplicateResolutionAction>>(new Map());
const duplicatesResolved = ref(false);
/** Duplicate conflicts must be resolved before the preview modal (and import) can proceed. */
const showConflictModal = computed(
  () => !!jsonImportResult.value && jsonImportResult.value.duplicates.length > 0 && !duplicatesResolved.value,
);

/** Maps the parser's conflicts onto the display shape the shared duplicate modal renders. */
const conflictItems = computed<DuplicateConflictItem[]>(() =>
  (jsonImportResult.value?.duplicates ?? []).map((conflict) => ({
    key: conflict.incoming.sourceIndex,
    matchLabel:
      conflict.match.source === 'database'
        ? 'Already in your library'
        : `Entry #${conflict.match.card.sourceIndex} earlier in this file`,
    canOverwrite: true,
    existing: {
      frontTitle: conflict.match.card.frontTitle,
      deckName: conflict.match.card.deckName,
      topicName: conflict.match.card.topicName,
      summary: conflict.match.card.backAnswer,
      createdAt: conflict.match.source === 'database' ? conflict.match.card.createdAt : undefined,
    },
    incoming: {
      frontTitle: conflict.incoming.frontTitle,
      deckName: conflict.incoming.deckName,
      topicName: conflict.incoming.topicName,
      summary: conflict.incoming.backAnswer,
    },
  })),
);
const toastMessage = ref('');
let toastTimer: ReturnType<typeof setTimeout> | undefined;

function showToast(message: string) {
  toastMessage.value = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
}

function triggerJsonImportPicker() {
  jsonFileInput.value?.click();
}

/** Shared by the file-upload flow and the paste/edit-JSON modal, both need the same up-to-date
 *  deck/topic/tag names to tell new names apart from reused ones. */
async function parseJsonCardImportText(text: string): Promise<JsonImportValidationResult> {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    topicStore.ensureLoaded(),
    tagStore.ensureLoaded(),
  ]);

  const topicNamesByDeck: Record<string, string[]> = {};
  for (const deck of deckStore.decks) {
    topicNamesByDeck[deck.name] = topicStore.byDeck(deck.id).map((topic) => topic.name);
  }

  const deckNameById = new Map(deckStore.decks.map((deck) => [deck.id, deck.name]));
  const existingCards = cardStore.cards
    .filter((card) => !card.isDeleted)
    .map((card) => ({
      id: card.id,
      frontTitle: card.frontTitle,
      backAnswer: card.backAnswer,
      extraInfo: card.extraInfo,
      deckName: deckNameById.get(card.deckId) ?? 'Unknown deck',
      topicName: card.topicId ? topicStore.getById(card.topicId)?.name : undefined,
      createdAt: card.createdAt,
    }));

  return parseJsonCardImport(text, {
    deckNames: deckStore.decks.map((deck) => deck.name),
    tagNames: tagStore.tags.map((tag) => tag.name),
    topicNamesByDeck,
    existingCards,
  });
}

/** Shared by the file-upload flow and the paste/edit-JSON modal: stages a freshly parsed result
 *  and resets any duplicate-conflict resolution left over from a previous import attempt. */
function startJsonImport(result: JsonImportValidationResult) {
  duplicateResolutions.value = new Map();
  duplicatesResolved.value = false;
  jsonImportResult.value = result;
}

async function handleJsonFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  jsonImportError.value = '';
  jsonImportResult.value = null;
  isParsingJson.value = true;
  try {
    const text = await file.text();
    const result = await parseJsonCardImportText(text);

    if (result.validCardsCount === 0) {
      jsonImportError.value = result.errors[0] ?? 'No valid cards were found in this file.';
    } else {
      startJsonImport(result);
    }
  } catch {
    jsonImportError.value = 'Could not read this file.';
  } finally {
    isParsingJson.value = false;
    if (jsonFileInput.value) jsonFileInput.value.value = '';
  }
}

// --- JSON text/paste import ---
const isTextImportModalOpen = ref(false);
const isValidatingJsonText = ref(false);
const jsonTextStructureError = ref('');

function openJsonTextImport() {
  jsonTextStructureError.value = '';
  isTextImportModalOpen.value = true;
}

function cancelJsonTextImport() {
  isTextImportModalOpen.value = false;
}

async function handleJsonTextValidate(text: string) {
  jsonTextStructureError.value = '';
  isValidatingJsonText.value = true;
  try {
    const result = await parseJsonCardImportText(text);
    if (result.validCardsCount === 0) {
      jsonTextStructureError.value = result.errors[0] ?? 'No valid cards were found in this JSON.';
    } else {
      isTextImportModalOpen.value = false;
      startJsonImport(result);
    }
  } catch {
    jsonTextStructureError.value = 'Could not process this JSON.';
  } finally {
    isValidatingJsonText.value = false;
  }
}

function cancelJsonImport() {
  jsonImportResult.value = null;
  duplicateResolutions.value = new Map();
  duplicatesResolved.value = false;
}

function handleConflictsResolved(resolutions: Map<number, DuplicateResolutionAction>) {
  duplicateResolutions.value = resolutions;
  duplicatesResolved.value = true;
}

async function confirmJsonImport() {
  const result = jsonImportResult.value;
  if (!result || result.parsedCards.length === 0) return;

  const { toCreate, toOverwrite } = resolveBatchDuplicates(
    result.parsedCards,
    result.duplicates,
    duplicateResolutions.value,
    (card) => card.sourceIndex,
  );
  if (toCreate.length === 0 && toOverwrite.length === 0) return;

  isImportingJson.value = true;
  try {
    // One batch for the whole import run, the same cache lifetime the hand-rolled Maps had.
    const resolve = createBatch();
    const newCards: NewCard[] = [];
    const overwrites: { id: string; changes: CardUpdate }[] = [];

    for (const card of toCreate) {
      const deckId = await resolve.deckId(card.deckName);
      const topicId = await resolve.topicId(deckId, card.topicName);
      const tagIds: string[] = [];
      for (const tagName of card.tagNames) {
        tagIds.push(await resolve.tagId(tagName));
      }

      newCards.push({
        frontTitle: card.frontTitle,
        backAnswer: card.backAnswer,
        extraInfo: card.extraInfo,
        deckId,
        topicId,
        tagIds,
        ipa: card.ipa,
        ttsEnabled: true,
        hint: card.hint,
        examples: card.examples,
        synonyms: card.synonyms,
        antonyms: card.antonyms,
        quizQuestions: [],
        partsOfSpeech: card.partsOfSpeech?.map((entry) => ({ ...entry, id: generateUUID() })),
      });
    }

    for (const { incoming: card, existing } of toOverwrite) {
      const deckId = await resolve.deckId(card.deckName);
      const topicId = await resolve.topicId(deckId, card.topicName);
      const tagIds: string[] = [];
      for (const tagName of card.tagNames) {
        tagIds.push(await resolve.tagId(tagName));
      }

      overwrites.push({
        id: existing.id,
        changes: {
          frontTitle: card.frontTitle,
          backAnswer: card.backAnswer,
          extraInfo: card.extraInfo,
          deckId,
          topicId,
          tagIds,
          ipa: card.ipa,
          hint: card.hint,
          examples: card.examples,
          synonyms: card.synonyms,
          antonyms: card.antonyms,
          partsOfSpeech: card.partsOfSpeech?.map((entry) => ({ ...entry, id: generateUUID() })),
        },
      });
    }

    if (newCards.length > 0) await cardStore.addMany(newCards);
    for (const { id, changes } of overwrites) {
      await cardStore.edit(id, changes);
    }
    await refreshStores();
    jsonImportResult.value = null;
    duplicateResolutions.value = new Map();
    duplicatesResolved.value = false;

    const parts: string[] = [];
    if (newCards.length > 0) parts.push(`imported ${newCards.length} card${newCards.length === 1 ? '' : 's'}`);
    if (overwrites.length > 0) parts.push(`overwrote ${overwrites.length} card${overwrites.length === 1 ? '' : 's'}`);
    const message = parts.join(', ');
    showToast(`${message.charAt(0).toUpperCase()}${message.slice(1)} from JSON.`);
  } finally {
    isImportingJson.value = false;
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
  <BorderedCard class="mb-6">
    <h2 class="text-card-gold mb-1 font-serif text-lg font-bold">Backup &amp; Data</h2>
    <p class="text-card-muted mb-4 text-xs">
      Export everything into a single .zip file, or import one to restore or merge data on this or
      another device. Prefer plain JSON instead? Use "Export All Data (JSON)" to download a readable
      snapshot of your decks, cards, tags, settings, and study history.
    </p>

    <div class="mb-3 flex flex-wrap gap-3">
      <BaseButton
        variant="secondary"
        size="sm"
        class="bg-card-gold/90! text-background! hover:bg-card-gold! rounded-full!"
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
        class="bg-card-gold/90! text-background! hover:bg-card-gold! rounded-full!"
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
      <BaseButton
        variant="secondary"
        size="sm"
        class="bg-card-gold/90! text-background! hover:bg-card-gold! rounded-full!"
        :loading="isExportingJson"
        @click="handleExportJson"
      >
        <AppIcon
          v-if="!isExportingJson"
          icon-name="DocumentDownload"
          :size="14"
        />
        {{ isExportingJson ? 'Exporting…' : 'Export All Data (JSON)' }}
      </BaseButton>
    </div>

    <p
      v-if="importSummary"
      class="text-text/70 text-xs font-medium"
    >
      Imported {{ importSummary.decks }} deck(s), {{ importSummary.topics }} topic(s),
      {{ importSummary.tags }} tag(s), {{ importSummary.cards }} card(s).
    </p>
    <p
      v-if="importError"
      class="text-danger flex items-center gap-1.5 text-xs font-medium"
    >
      <WarningIcon />
      {{ importError }}
    </p>

    <hr class="border-card-gold/10 my-4" />

    <p class="text-card-muted mb-3 text-xs">
      Bulk-create new cards from a spreadsheet instead of a backup file, useful for adding a batch
      of vocabulary, grammar, or idiom cards at once.
    </p>
    <div class="flex flex-wrap gap-3">
      <BaseButton
        variant="secondary"
        size="sm"
        class="bg-card-gold/90! text-background! hover:bg-card-gold! rounded-full!"
        to="/cards/import"
      >
        Import Cards (Excel)
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="sm"
        class="bg-card-gold/90! text-background! hover:bg-card-gold! rounded-full!"
        :loading="isParsingJson"
        @click="triggerJsonImportPicker"
      >
        <AppIcon
          v-if="!isParsingJson"
          icon-name="DocumentUpload"
          :size="14"
        />
        {{ isParsingJson ? 'Reading…' : 'Import JSON Cards' }}
      </BaseButton>
      <input
        ref="jsonFileInput"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleJsonFileSelected"
      />
      <BaseButton
        variant="secondary"
        size="sm"
        class="bg-card-gold/90! text-background! hover:bg-card-gold! rounded-full!"
        @click="openJsonTextImport"
      >
        <AppIcon
          icon-name="Code"
          :size="14"
        />
        Paste / Edit Raw JSON
      </BaseButton>
    </div>

    <p
      v-if="jsonImportError"
      class="text-danger mt-3 flex items-center gap-1.5 text-xs font-medium"
    >
      <WarningIcon />
      {{ jsonImportError }}
    </p>
  </BorderedCard>

  <BorderedCard>
    <h2 class="text-card-gold mb-1 font-serif text-lg font-bold">Danger Zone</h2>
    <p class="text-card-muted mb-3 text-xs">
      Permanently deletes every deck, card, and tag on this device, and resets your settings. This
      can't be undone.
    </p>
    <BaseButton
      variant="ghost"
      danger
      size="sm"
      class="rounded-full!"
      @click="isConfirmingClear = true"
    >
      <AppIcon
        icon-name="Trash"
        :size="14"
      />
      Clear All Data
    </BaseButton>
  </BorderedCard>

  <ConfirmDialog
    v-if="isConfirmingClear"
    title="Clear all data?"
    message="This permanently deletes every deck, card, and tag on this device, and resets your settings. This can't be undone."
    confirm-label="Clear Everything"
    variant="danger"
    @confirm="handleClearAll"
    @cancel="isConfirmingClear = false"
  />

  <JsonTextImportModal
    v-if="isTextImportModalOpen"
    :is-validating="isValidatingJsonText"
    :structure-error="jsonTextStructureError"
    @validate="handleJsonTextValidate"
    @close="cancelJsonTextImport"
  />

  <DuplicateCardBatchModal
    v-if="showConflictModal"
    :conflicts="conflictItems"
    @resolve="handleConflictsResolved"
    @cancel="cancelJsonImport"
  />

  <JsonImportPreviewModal
    v-if="jsonImportResult && !showConflictModal"
    :result="jsonImportResult"
    :resolutions="duplicateResolutions"
    :is-importing="isImportingJson"
    @confirm="confirmJsonImport"
    @cancel="cancelJsonImport"
  />

  <Transition name="fade">
    <div
      v-if="toastMessage"
      class="bg-primary text-background fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded px-4 py-2 text-sm font-medium shadow-lg"
      role="status"
    >
      {{ toastMessage }}
    </div>
  </Transition>
</template>
