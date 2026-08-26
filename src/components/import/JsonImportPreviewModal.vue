<script setup lang="ts">
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import type { JsonImportValidationResult } from '@/utils/import/json-card-importer';

defineProps<{
  result: JsonImportValidationResult;
  isImporting: boolean;
}>();

const emit = defineEmits<{ confirm: []; cancel: [] }>();

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
</script>

<template>
  <BaseModal max-width="max-w-lg" @close="emit('cancel')">
    <h2 class="text-base font-semibold text-text">Import Preview</h2>

    <div class="mt-3 flex flex-wrap gap-4 text-xs text-text/60">
      <span class="font-medium text-text">
        {{ result.validCardsCount }} card{{ result.validCardsCount === 1 ? '' : 's' }} ready to import
      </span>
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

    <div v-if="result.parsedCards.length > 0" class="mt-3 max-h-72 space-y-2 overflow-y-auto">
      <div
        v-for="card in result.parsedCards"
        :key="card.sourceIndex"
        class="rounded-lg border border-text/10 p-2.5"
      >
        <div class="mb-1 flex items-center justify-between gap-2">
          <p class="min-w-0 truncate text-sm font-medium text-text">{{ card.frontTitle }}</p>
          <span class="shrink-0 text-xs text-text/50">{{ card.deckName }} › {{ card.topicName }}</span>
        </div>
        <p class="text-xs text-text/60">{{ truncate(card.backAnswer, 120) }}</p>
      </div>
    </div>

    <p v-else class="mt-3 text-sm text-text/50">No valid cards were found in this file.</p>

    <div class="mt-5 flex gap-3">
      <BaseButton variant="ghost" block :disabled="isImporting" @click="emit('cancel')">
        Cancel
      </BaseButton>
      <BaseButton
        variant="primary"
        block
        :disabled="result.validCardsCount === 0"
        :loading="isImporting"
        @click="emit('confirm')"
      >
        Confirm Import ({{ result.validCardsCount }})
      </BaseButton>
    </div>
  </BaseModal>
</template>
