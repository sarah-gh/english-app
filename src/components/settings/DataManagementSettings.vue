<script setup lang="ts">
import { ref, shallowRef } from 'vue';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BorderedCard from '@/components/common/BorderedCard.vue';
import JsonImportPreviewModal from '@/components/import/JsonImportPreviewModal.vue';
import JsonTextImportModal from '@/components/import/JsonTextImportModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
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
import type { NewCard } from '@/types/card';
import { parseJsonCardImport, type JsonImportValidationResult } from '@/utils/import/json-card-importer';
import { getRandomTagColor } from '@/utils/tag-color';

const settingsStore = useSettingsStore();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
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
  await Promise.all([cardStore.fetchAll(), deckStore.fetchAll(), topicStore.fetchAll(), tagStore.fetchAll()]);
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
// reactive Proxies — they get handed to IndexedDB as-is on import, and Dexie/structured-clone
// can't clone a Proxy (the same DataCloneError pitfall documented in the quiz session store).
const jsonImportResult = shallowRef<JsonImportValidationResult | null>(null);
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

/** Shared by the file-upload flow and the paste/edit-JSON modal — both need the same up-to-date
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

  return parseJsonCardImport(text, {
    deckNames: deckStore.decks.map((deck) => deck.name),
    tagNames: tagStore.tags.map((tag) => tag.name),
    topicNamesByDeck,
  });
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
      jsonImportResult.value = result;
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
      jsonImportResult.value = result;
    }
  } catch {
    jsonTextStructureError.value = 'Could not process this JSON.';
  } finally {
    isValidatingJsonText.value = false;
  }
}

function cancelJsonImport() {
  jsonImportResult.value = null;
}

/** Reuses an existing deck by case-insensitive name match, otherwise creates one — mirroring the
 *  resolve-or-create pattern the Excel importer uses. */
async function resolveDeckId(name: string, cache: Map<string, string>): Promise<string> {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = deckStore.decks.find((deck) => deck.name.toLowerCase() === key);
  const deck = existing ?? (await deckStore.add({ name }));
  cache.set(key, deck.id);
  return deck.id;
}

/** Topics are scoped per-deck, so the cache/lookup key includes the deck id. */
async function resolveTopicId(deckId: string, name: string, cache: Map<string, string>): Promise<string> {
  const key = `${deckId}::${name.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = topicStore.byDeck(deckId).find((topic) => topic.name.toLowerCase() === name.toLowerCase());
  const topic = existing ?? (await topicStore.add({ deckId, name }));
  cache.set(key, topic.id);
  return topic.id;
}

async function resolveTagId(name: string, cache: Map<string, string>): Promise<string> {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = tagStore.tags.find((tag) => tag.name.toLowerCase() === key);
  const tag = existing ?? (await tagStore.add({ name, color: getRandomTagColor() }));
  cache.set(key, tag.id);
  return tag.id;
}

async function confirmJsonImport() {
  const result = jsonImportResult.value;
  if (!result || result.parsedCards.length === 0) return;

  isImportingJson.value = true;
  try {
    const deckCache = new Map<string, string>();
    const topicCache = new Map<string, string>();
    const tagCache = new Map<string, string>();
    const newCards: NewCard[] = [];

    for (const card of result.parsedCards) {
      const deckId = await resolveDeckId(card.deckName, deckCache);
      const topicId = await resolveTopicId(deckId, card.topicName, topicCache);
      const tagIds: string[] = [];
      for (const tagName of card.tagNames) {
        tagIds.push(await resolveTagId(tagName, tagCache));
      }

      newCards.push({
        frontTitle: card.frontTitle,
        backAnswer: card.backAnswer,
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
        partsOfSpeech: card.partsOfSpeech?.map((entry) => ({ ...entry, id: crypto.randomUUID() })),
        wordFamily: card.wordFamily,
      });
    }

    await cardStore.addMany(newCards);
    await refreshStores();
    jsonImportResult.value = null;
    showToast(`Imported ${newCards.length} card${newCards.length === 1 ? '' : 's'} from JSON.`);
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
    <h2 class="mb-1 font-serif text-lg font-bold text-card-gold">Backup &amp; Data</h2>
    <p class="mb-4 text-xs text-card-muted">
      Export everything into a single .zip file, or import one to restore or merge data on this or
      another device. Prefer plain JSON instead? Use "Export All Data (JSON)" to download a
      readable snapshot of your decks, cards, tags, settings, and study history.
    </p>

    <div class="mb-3 flex flex-wrap gap-3">
      <BaseButton
        variant="secondary"
        size="sm"
        class="rounded-full! bg-card-gold/90! text-background! hover:bg-card-gold!"
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
        class="rounded-full! bg-card-gold/90! text-background! hover:bg-card-gold!"
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
        class="rounded-full! bg-card-gold/90! text-background! hover:bg-card-gold!"
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

    <hr class="my-4 border-card-gold/10" />

    <p class="mb-3 text-xs text-card-muted">
      Bulk-create new cards from a spreadsheet instead of a backup file — useful for adding a
      batch of vocabulary, grammar, or idiom cards at once.
    </p>
    <div class="flex flex-wrap gap-3">
      <BaseButton
        variant="secondary"
        size="sm"
        class="rounded-full! bg-card-gold/90! text-background! hover:bg-card-gold!"
        to="/cards/import"
      >
        Import Cards (Excel)
      </BaseButton>
      <BaseButton
        variant="secondary"
        size="sm"
        class="rounded-full! bg-card-gold/90! text-background! hover:bg-card-gold!"
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
        class="rounded-full! bg-card-gold/90! text-background! hover:bg-card-gold!"
        @click="openJsonTextImport"
      >
        <AppIcon icon-name="Code" :size="14" />
        Paste / Edit Raw JSON
      </BaseButton>
    </div>

    <p
      v-if="jsonImportError"
      class="mt-3 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ jsonImportError }}
    </p>
  </BorderedCard>

  <BorderedCard>
    <h2 class="mb-1 font-serif text-lg font-bold text-card-gold">Danger Zone</h2>
    <p class="mb-3 text-xs text-card-muted">
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

  <JsonImportPreviewModal
    v-if="jsonImportResult"
    :result="jsonImportResult"
    :is-importing="isImportingJson"
    @confirm="confirmJsonImport"
    @cancel="cancelJsonImport"
  />

  <Transition name="fade">
    <div
      v-if="toastMessage"
      class="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded bg-primary px-4 py-2 text-sm font-medium text-background shadow-lg"
      role="status"
    >
      {{ toastMessage }}
    </div>
  </Transition>
</template>
