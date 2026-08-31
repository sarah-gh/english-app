<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import ImportPreviewCard from '@/components/import/ImportPreviewCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import {
  downloadImportTemplate,
  ExcelImportError,
  parseCardsWorkbook,
  type ParsedCardRow,
} from '@/services/import/excel-card-import';
import type { NewCard } from '@/types/card';
import { getRandomTagColor } from '@/utils/tag-color';

const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();

const fileInput = ref<HTMLInputElement | null>(null);
const fileName = ref('');
const parsedRows = ref<ParsedCardRow[]>([]);
const parseError = ref('');
const isParsing = ref(false);
const isImporting = ref(false);
const importSummary = ref('');
/** Row numbers currently checked for import — starts with every valid row selected, so opting
 *  out of specific cards is the exception, not the default action. */
const selectedRowNumbers = ref<Set<number>>(new Set());

const validRows = computed(() => parsedRows.value.filter((row) => row.errors.length === 0));
const invalidRows = computed(() => parsedRows.value.filter((row) => row.errors.length > 0));
const selectedRows = computed(() =>
  validRows.value.filter((row) => selectedRowNumbers.value.has(row.rowNumber)),
);
const allSelected = computed(
  () => validRows.value.length > 0 && selectedRows.value.length === validRows.value.length,
);

function isRowSelected(rowNumber: number): boolean {
  return selectedRowNumbers.value.has(rowNumber);
}

function setRowSelected(rowNumber: number, isSelected: boolean): void {
  const next = new Set(selectedRowNumbers.value);
  if (isSelected) next.add(rowNumber);
  else next.delete(rowNumber);
  selectedRowNumbers.value = next;
}

function toggleSelectAll(): void {
  selectedRowNumbers.value = allSelected.value
    ? new Set()
    : new Set(validRows.value.map((row) => row.rowNumber));
}

const newDeckNames = computed(() => {
  const existing = new Set(deckStore.decks.map((deck) => deck.name.toLowerCase()));
  const names = new Set<string>();
  for (const row of validRows.value) {
    if (!existing.has(row.deckName.toLowerCase())) names.add(row.deckName);
  }
  return names;
});

const newTagNames = computed(() => {
  const existing = new Set(tagStore.tags.map((tag) => tag.name.toLowerCase()));
  const names = new Set<string>();
  for (const row of validRows.value) {
    for (const tagName of row.tagNames) {
      if (!existing.has(tagName.toLowerCase())) names.add(tagName);
    }
  }
  return names;
});

async function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  fileName.value = file.name;
  parseError.value = '';
  parsedRows.value = [];
  selectedRowNumbers.value = new Set();
  importSummary.value = '';
  isParsing.value = true;
  try {
    const rows = await parseCardsWorkbook(file);
    parsedRows.value = rows;
    selectedRowNumbers.value = new Set(
      rows.filter((row) => row.errors.length === 0).map((row) => row.rowNumber),
    );
  } catch (error) {
    parseError.value = error instanceof ExcelImportError ? error.message : 'Could not read this file.';
  } finally {
    isParsing.value = false;
  }
}

/** Discards the uploaded file buffer and every bit of parsed/selection state without touching
 *  the database — closes the preview back to the empty upload screen. */
function handleCancel() {
  fileName.value = '';
  parsedRows.value = [];
  selectedRowNumbers.value = new Set();
  parseError.value = '';
  importSummary.value = '';
  if (fileInput.value) fileInput.value.value = '';
}

/** Reuses an existing deck by case-insensitive name match, otherwise creates one — mirroring
 *  the resolve-or-create pattern used when adding a single card from the editor. */
async function resolveDeckId(name: string, cache: Map<string, string>): Promise<string> {
  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = deckStore.decks.find((deck) => deck.name.toLowerCase() === key);
  const deck = existing ?? (await deckStore.add({ name }));
  cache.set(key, deck.id);
  return deck.id;
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

async function handleImport() {
  if (selectedRows.value.length === 0) return;
  isImporting.value = true;
  try {
    const deckCache = new Map<string, string>();
    const tagCache = new Map<string, string>();
    const newCards: NewCard[] = [];

    for (const row of selectedRows.value) {
      const deckId = await resolveDeckId(row.deckName, deckCache);
      const tagIds: string[] = [];
      for (const tagName of row.tagNames) {
        tagIds.push(await resolveTagId(tagName, tagCache));
      }

      newCards.push({
        frontTitle: row.frontTitle,
        backAnswer: row.backAnswer,
        deckId,
        tagIds,
        ipa: row.ipa,
        ttsEnabled: true,
        hint: row.hint,
        examples: [...row.examples],
        synonyms: [],
        antonyms: [],
        quizQuestions: [],
      });
    }

    await cardStore.addMany(newCards);
    importSummary.value = `Imported ${newCards.length} card${newCards.length === 1 ? '' : 's'} successfully.`;

    // Only drop the rows that were actually imported — deselected rows and rows still needing
    // fixes stay in the preview so a partial import doesn't throw away the rest of the batch.
    const importedRowNumbers = new Set(selectedRows.value.map((row) => row.rowNumber));
    parsedRows.value = parsedRows.value.filter((row) => !importedRowNumbers.has(row.rowNumber));
    selectedRowNumbers.value = new Set();

    if (parsedRows.value.length === 0) {
      fileName.value = '';
      if (fileInput.value) fileInput.value.value = '';
    }
  } finally {
    isImporting.value = false;
  }
}

function goToCards() {
  router.push('/cards');
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <RouterLink to="/cards" class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary">
      <AppIcon icon-name="ArrowLeft" :size="14" />
      Cards
    </RouterLink>

    <h1 class="mb-1 text-xl font-semibold text-text">Import from Excel</h1>
    <p class="mb-6 text-sm text-text/50">
      Bulk-create cards from an .xlsx file. Since a spreadsheet cell can't hold binary data, imported cards are
      text-only — add photos, videos, or audio afterwards from each card's editor.
    </p>

    <div class="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-text/10 p-4">
      <BaseButton variant="secondary" size="sm" @click="downloadImportTemplate">
        <AppIcon icon-name="DocumentDownload" :size="14" />
        Download template
      </BaseButton>
      <span class="text-xs text-text/50">
        Columns: Front, Back, Deck, Tags, Hint, IPA, Examples. Only Front, Back, and Deck are required. Separate
        multiple Tags or Examples with a comma or semicolon.
      </span>
    </div>

    <div class="mb-6">
      <label class="mb-1 block text-xs font-medium text-text/60">Excel file (.xlsx)</label>
      <input
ref="fileInput" type="file" accept=".xlsx"
        class="block w-full text-sm text-text/70 file:mr-3 file:rounded file:border file:border-primary file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:file:bg-primary hover:file:text-background"
        @change="handleFileChange" />
    </div>

    <p v-if="isParsing" class="text-sm text-text/50">
      Reading {{ fileName }}…
    </p>

    <p v-if="parseError" class="rounded-lg border border-text/20 bg-text/5 px-4 py-3 text-sm text-text">
      {{ parseError }}
    </p>

    <p
v-if="importSummary"
      class="rounded-lg border border-primary bg-primary px-4 py-3 text-sm font-medium text-background">
      {{ importSummary }}
      <button type="button" class="ml-2 underline underline-offset-2" @click="goToCards">
        View cards
      </button>
    </p>

    <template v-if="parsedRows.length > 0">
      <div class="mb-4 flex flex-wrap gap-4 text-xs text-text/60">
        <span>{{ parsedRows.length }} row{{ parsedRows.length === 1 ? '' : 's' }} found</span>
        <span class="font-medium text-text">{{ validRows.length }} ready to import</span>
        <span v-if="invalidRows.length > 0">{{ invalidRows.length }} with errors (skipped)</span>
        <span v-if="newDeckNames.size > 0">{{ newDeckNames.size }} new deck(s) will be created</span>
        <span v-if="newTagNames.size > 0">{{ newTagNames.size }} new tag(s) will be created</span>
      </div>

      <div class="mb-4 flex items-center justify-between rounded-lg border border-text/10 px-3 py-2.5">
        <label class="flex items-center gap-2 text-sm text-text/70">
          <input
type="checkbox" :checked="allSelected" :disabled="validRows.length === 0"
            class="h-4 w-4 accent-primary disabled:cursor-not-allowed" @change="toggleSelectAll" />
          {{ allSelected ? 'Deselect All' : 'Select All' }}
        </label>
        <span class="text-xs font-medium text-text/60">
          {{ selectedRows.length }}/{{ validRows.length }} selected
        </span>
      </div>

      <div class="mb-4 max-h-125 space-y-3 overflow-y-auto">
        <ImportPreviewCard
v-for="row in parsedRows" :key="row.rowNumber" :row="row"
          :selected="isRowSelected(row.rowNumber)" @update:selected="(value) => setRowSelected(row.rowNumber, value)" />
      </div>

      <div class="flex flex-wrap gap-3">
        <BaseButton variant="ghost" @click="handleCancel">
          Cancel Upload
        </BaseButton>
        <BaseButton
variant="primary" :disabled="selectedRows.length === 0" :loading="isImporting"
          @click="handleImport">
          Import Selected Cards ({{ selectedRows.length }}/{{ validRows.length }})
        </BaseButton>
      </div>
    </template>
  </div>
</template>
