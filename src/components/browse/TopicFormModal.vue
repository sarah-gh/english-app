<script setup lang="ts">
import { ref } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import type { Topic } from '@/types/topic';

const props = defineProps<{
  /** Present when renaming an existing topic; omitted when creating a new one. */
  topic?: Topic | null;
}>();

const emit = defineEmits<{
  save: [{ name: string; description?: string }];
  cancel: [];
}>();

const name = ref(props.topic?.name ?? '');
const description = ref(props.topic?.description ?? '');

function submit() {
  const trimmedName = name.value.trim();
  if (!trimmedName) return;
  emit('save', { name: trimmedName, description: description.value.trim() || undefined });
}
</script>

<template>
  <BaseModal @close="emit('cancel')">
    <h2 class="text-base font-semibold text-text">{{ topic ? 'Rename Topic' : 'New Topic' }}</h2>
    <div class="mt-4 flex flex-col gap-3">
      <BaseInput
        v-model="name"
        label="Topic name"
        placeholder="e.g. Food & Drink"
        required
        @keyup.enter="submit"
      />
      <BaseInput
        v-model="description"
        label="Description (optional)"
        placeholder="Short note about this topic"
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
        :disabled="!name.trim()"
        @click="submit"
      >
        Save
      </BaseButton>
    </div>
  </BaseModal>
</template>
