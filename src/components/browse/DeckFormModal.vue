<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

const props = defineProps<{
  /** Existing deck names, used to block case-insensitive duplicates. */
  existingNames: string[];
}>();

const emit = defineEmits<{
  save: [{ name: string }];
  cancel: [];
}>();

const name = ref('');

const isDuplicate = computed(() => {
  const trimmed = name.value.trim().toLowerCase();
  if (!trimmed) return false;
  return props.existingNames.some((existing) => existing.trim().toLowerCase() === trimmed);
});

const error = computed(() => (isDuplicate.value ? 'A deck with this name already exists.' : undefined));

function submit() {
  const trimmedName = name.value.trim();
  if (!trimmedName || isDuplicate.value) return;
  emit('save', { name: trimmedName });
}
</script>

<template>
  <BaseModal @close="emit('cancel')">
    <h2 class="text-base font-semibold text-text">New Deck</h2>
    <div class="mt-4 flex flex-col gap-3">
      <BaseInput
        v-model="name"
        label="Deck name"
        placeholder="e.g. Business English"
        required
        :error="error"
        @keyup.enter="submit"
      />
    </div>
    <div class="mt-5 flex gap-3">
      <BaseButton
        variant="ghost"
        block
        @click="emit('cancel')"
      >
        Cancel
      </BaseButton>
      <BaseButton
        variant="primary"
        block
        :disabled="!name.trim() || isDuplicate"
        @click="submit"
      >
        Create
      </BaseButton>
    </div>
  </BaseModal>
</template>
