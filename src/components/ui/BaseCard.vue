<script setup lang="ts">
withDefaults(defineProps<{ padding?: 'none' | 'sm' | 'md' }>(), { padding: 'md' });
</script>

<template>
  <div
    class="rounded-xl border border-neutral-200/80"
    :class="{ 'p-4': padding === 'md', 'p-3': padding === 'sm' }"
  >
    <slot />
  </div>
</template>
