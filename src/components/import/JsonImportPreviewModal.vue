<script setup lang="ts">
import { computed } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import type { DuplicateResolutionAction } from '@/types/duplicate-card';
import { resolveBatchDuplicates } from '@/utils/duplicate-cards';
import type { JsonImportValidationResult } from '@/utils/import/json-card-importer';
import { stripHtmlToText } from '@/utils/html';

const props = defineProps<{
  result: JsonImportValidationResult;
  resolutions: Map<number, DuplicateResolutionAction>;
  isImporting: boolean;
}>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();

const resolved = computed(() =>
  resolveBatchDuplicates(
    props.result.parsedCards,
    props.result.duplicates,
    props.resolutions,
    (card) => card.sourceIndex,
  ),
);

const overwriteSourceIndexes = computed(
  () => new Set(resolved.value.toOverwrite.map((entry) => entry.incoming.sourceIndex)),
);

/** Cards actually headed for import, in original file order: creates and overwrites, minus
 *  whatever got skipped or dropped in favor of a later "overwrite" duplicate. */
const visibleCards = computed(() => {
  const createSourceIndexes = new Set(resolved.value.toCreate.map((card) => card.sourceIndex));
  return props.result.parsedCards.filter(
    (card) => createSourceIndexes.has(card.sourceIndex) || overwriteSourceIndexes.value.has(card.sourceIndex),
  );
});

const importCount = computed(() => resolved.value.toCreate.length + resolved.value.toOverwrite.length);
const skippedCount = computed(() => props.result.parsedCards.length - importCount.value);

function truncate(text: string, max: number): string {
  const plain = stripHtmlToText(text);
  return plain.length > max ? `${plain.slice(0, max - 1)}…` : plain;
}
</script>

<template>
  <BaseModal max-width="max-w-lg" @close="emit('cancel')">
    <h2 class="text-base font-semibold text-text">Import Preview</h2>

    <div class="mt-3 flex flex-wrap gap-4 text-xs text-text/60">
      <span class="font-medium text-text">
        {{ importCount }} card{{ importCount === 1 ? '' : 's' }} ready to import
      </span>
      <span v-if="resolved.toOverwrite.length > 0">
        {{ resolved.toOverwrite.length }} will overwrite existing card(s)
      </span>
      <span v-if="skippedCount > 0">{{ skippedCount }} skipped as duplicate(s)</span>
      <span v-if="result.decksToCreate.length > 0">{{ result.decksToCreate.length }} new deck(s)</span>
      <span v-if="result.topicsToCreate.length > 0">{{ result.topicsToCreate.length }} new topic(s)</span>
      <span v-if="result.tagsToCreate.length > 0">{{ result.tagsToCreate.length }} new tag(s)</span>
    </div>

    <div v-if="result.decksToCreate.length > 0 || result.topicsToCreate.length > 0 || result.tagsToCreate.length > 0" class="mt-3 space-y-1.5 rounded-lg border border-text/10 p-3 text-xs">
      <p v-if="result.decksToCreate.length > 0" class="text-text/70">
        <span class="font-semibold text-text">New decks:</span> {{ result.decksToCreate.join(', ') }}
      </p>
      <p v-if="result.topicsToCreate.length > 0" class="text-text/70">
        <span class="font-semibold text-text">New topics:</span> {{ result.topicsToCreate.join(', ') }}
      </p>
      <p v-if="result.tagsToCreate.length > 0" class="text-text/70">
        <span class="font-semibold text-text">New tags:</span> {{ result.tagsToCreate.join(', ') }}
      </p>
    </div>

    <div v-if="result.errors.length > 0" class="mt-3 max-h-24 space-y-1 overflow-y-auto rounded-lg border border-danger/30 p-3">
      <p v-for="(error, index) in result.errors" :key="index" class="flex items-start gap-1.5 text-xs font-medium text-danger">
        <WarningIcon />
        <span>{{ error }}</span>
      </p>
    </div>

    <div v-if="visibleCards.length > 0" class="mt-3 max-h-72 space-y-2 overflow-y-auto">
      <div
        v-for="card in visibleCards"
        :key="card.sourceIndex"
        class="rounded-lg border border-text/10 p-2.5"
      >
        <div class="mb-1 flex items-center justify-between gap-2">
          <p class="min-w-0 truncate text-sm font-medium text-text">{{ card.frontTitle }}</p>
          <span class="shrink-0 text-xs text-text/50">{{ card.deckName }} › {{ card.topicName }}</span>
        </div>
        <p class="text-xs text-text/60">{{ truncate(card.backAnswer, 120) }}</p>
        <span
          v-if="overwriteSourceIndexes.has(card.sourceIndex)"
          class="mt-1 inline-block rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary"
        >
          Will overwrite existing card
        </span>
      </div>
    </div>

    <p v-else class="mt-3 text-sm text-text/50">No cards will be imported.</p>

    <div class="mt-5 flex gap-3">
      <BaseButton variant="ghost" block :disabled="isImporting" @click="emit('cancel')">
        Cancel
      </BaseButton>
      <BaseButton
        variant="primary"
        block
        :disabled="importCount === 0"
        :loading="isImporting"
        @click="emit('confirm')"
      >
        Confirm Import ({{ importCount }})
      </BaseButton>
    </div>
  </BaseModal>
</template>
