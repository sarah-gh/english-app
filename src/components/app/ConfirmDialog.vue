<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

withDefaults(
  defineProps<{
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
  }>(),
  {
    message: undefined,
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <BaseModal @close="emit('cancel')">
    <h2 class="text-base font-semibold text-black">{{ title }}</h2>
    <p
      v-if="message"
      class="mt-2 text-sm text-gray-600"
    >
      {{ message }}
    </p>
    <div class="mt-5 flex gap-3">
      <BaseButton
        variant="ghost"
        block
        @click="emit('cancel')"
      >
        {{ cancelLabel }}
      </BaseButton>
      <BaseButton
        variant="primary"
        block
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
