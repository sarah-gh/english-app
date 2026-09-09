<script setup lang="ts">
import WarningIcon from '@/components/app/WarningIcon.vue';
import DuplicateCardComparison from '@/components/card/DuplicateCardComparison.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import type { DuplicateConflictItem, DuplicateResolutionAction } from '@/types/duplicate-card';

defineProps<{
  conflict: DuplicateConflictItem;
  isSaving?: boolean;
}>();

const emit = defineEmits<{ resolve: [action: DuplicateResolutionAction]; cancel: [] }>();
</script>

<template>
  <BaseModal
    max-width="max-w-xl"
    @close="emit('cancel')"
  >
    <h2 class="text-text flex items-center gap-1.5 text-base font-semibold">
      <WarningIcon />
      This card already exists
    </h2>
    <p class="text-text/60 mt-1 text-sm">
      A card titled "{{ conflict.incoming.frontTitle }}" is already saved. Choose what to do
      before continuing.
    </p>

    <DuplicateCardComparison
      class="mt-3"
      :existing="conflict.existing"
      :incoming="conflict.incoming"
      :match-label="conflict.matchLabel"
    />

    <div class="mt-5 flex flex-col gap-2 sm:flex-row">
      <BaseButton
        variant="ghost"
        block
        :disabled="isSaving"
        @click="emit('resolve', 'skip')"
      >
        Keep Existing
      </BaseButton>
      <BaseButton
        v-if="conflict.canOverwrite"
        variant="primary"
        block
        :loading="isSaving"
        @click="emit('resolve', 'overwrite')"
      >
        Replace Existing
      </BaseButton>
      <BaseButton
        variant="secondary"
        block
        :disabled="isSaving"
        @click="emit('resolve', 'keep-both')"
      >
        Keep Both
      </BaseButton>
    </div>
  </BaseModal>
</template>
