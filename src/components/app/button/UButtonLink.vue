<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: string;
    variant?: 'mono' | 'primary';
  }>(),
  {
    size: '14',
    variant: 'primary',
  },
);
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center justify-center font-medium underline-offset-4 transition-colors hover:underline"
    :class="
      variant === 'mono'
        ? 'text-text/60 hover:text-text'
        : 'text-primary hover:text-primary/70'
    "
    :style="{ fontSize: `${size}px` }"
  >
    <slot />
  </button>
</template>
