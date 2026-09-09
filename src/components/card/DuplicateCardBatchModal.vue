<script setup lang="ts">
import { reactive } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import DuplicateCardComparison from '@/components/card/DuplicateCardComparison.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import type { DuplicateConflictItem, DuplicateResolutionAction } from '@/types/duplicate-card';

const props = defineProps<{ conflicts: DuplicateConflictItem[] }>();

const emit = defineEmits<{
  resolve: [resolutions: Map<number, DuplicateResolutionAction>];
  cancel: [];
}>();

const ACTION_OPTIONS: { value: DuplicateResolutionAction; label: string }[] = [
  { value: 'skip', label: 'Keep Existing' },
  { value: 'overwrite', label: 'Overwrite' },
  { value: 'keep-both', label: 'Keep Both' },
];

// Every conflict starts on "skip", the safe choice of never silently replacing or duplicating
// anything, until the user picks otherwise per row or with one of the batch buttons.
const resolutions = reactive(
  new Map<number, DuplicateResolutionAction>(
    props.conflicts.map((conflict) => [conflict.key, 'skip']),
  ),
);

function setAll(action: DuplicateResolutionAction) {
  for (const conflict of props.conflicts) {
    if (action === 'overwrite' && !conflict.canOverwrite) continue;
    resolutions.set(conflict.key, action);
  }
}

function optionsFor(conflict: DuplicateConflictItem) {
  return conflict.canOverwrite
    ? ACTION_OPTIONS
    : ACTION_OPTIONS.filter((option) => option.value !== 'overwrite');
}
</script>

<template>
  <BaseModal
    max-width="max-w-2xl"
    @close="emit('cancel')"
  >
    <h2 class="text-text flex items-center gap-1.5 text-base font-semibold">
      <WarningIcon />
      Duplicate cards found
    </h2>
    <p class="text-text/60 mt-1 text-xs">
      {{ conflicts.length }} incoming card{{ conflicts.length === 1 ? '' : 's' }} already exist
      with the exact same title. Choose what to do with each one, or apply one choice to all.
    </p>

    <div class="mt-3 flex flex-wrap gap-2">
      <BaseButton
        variant="ghost"
        size="sm"
        @click="setAll('skip')"
      >
        Skip All Duplicates
      </BaseButton>
      <BaseButton
        variant="ghost"
        size="sm"
        @click="setAll('overwrite')"
      >
        Overwrite All
      </BaseButton>
      <BaseButton
        variant="ghost"
        size="sm"
        @click="setAll('keep-both')"
      >
        Keep Both for All
      </BaseButton>
    </div>

    <div class="mt-3 max-h-96 space-y-3 overflow-y-auto pr-1">
      <div
        v-for="conflict in conflicts"
        :key="conflict.key"
        class="border-text/10 rounded-lg border p-3"
      >
        <p class="text-text mb-2 min-w-0 truncate text-sm font-semibold">
          "{{ conflict.incoming.frontTitle }}"
        </p>

        <DuplicateCardComparison
          :existing="conflict.existing"
          :incoming="conflict.incoming"
          :match-label="conflict.matchLabel"
          :summary-length="120"
        />

        <BaseSegmentedToggle
          class="mt-2"
          size="sm"
          :model-value="resolutions.get(conflict.key) ?? 'skip'"
          :options="optionsFor(conflict)"
          @update:model-value="(value) => resolutions.set(conflict.key, value)"
        />
      </div>
    </div>

    <div class="mt-5 flex gap-3">
      <BaseButton
        variant="ghost"
        block
        @click="emit('cancel')"
      >
        Cancel Import
      </BaseButton>
      <BaseButton
        variant="primary"
        block
        @click="emit('resolve', new Map(resolutions))"
      >
        Continue
      </BaseButton>
    </div>
  </BaseModal>
</template>
