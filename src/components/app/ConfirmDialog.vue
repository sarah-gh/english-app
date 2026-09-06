<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseModal from '@/components/ui/BaseModal.vue';

withDefaults(
  defineProps<{
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    /** 'danger' colors the confirm button red, use for irreversible/destructive actions. */
    variant?: 'primary' | 'danger';
  }>(),
  {
    message: undefined,
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    variant: 'primary',
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <BaseModal @close="emit('cancel')">
    <h2 class="text-text text-base font-semibold">{{ title }}</h2>
    <p
      v-if="message"
      class="text-text/60 mt-2 text-sm"
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
        :danger="variant === 'danger'"
        block
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
