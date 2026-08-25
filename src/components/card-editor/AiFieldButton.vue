<script setup lang="ts">
import AiSparkleIcon from '@/components/app/AiSparkleIcon.vue';

withDefaults(
  defineProps<{
    loading?: boolean;
    disabled?: boolean;
    /** Tooltip shown on hover — swaps to a "enter a word first" hint when disabled for that reason. */
    title?: string;
  }>(),
  {
    loading: false,
    disabled: false,
    title: 'Auto-fill this field with AI',
  },
);

const emit = defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    :disabled="disabled || loading"
    :title="title"
    :aria-label="title"
    class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:text-text/25 disabled:hover:bg-transparent"
    @click="emit('click')"
  >
    <svg
      v-if="loading"
      class="h-5 w-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
    <AiSparkleIcon
      v-else
      :size="16"
    />
  </button>
</template>
