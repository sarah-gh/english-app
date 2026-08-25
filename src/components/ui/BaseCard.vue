<script setup lang="ts">
withDefaults(defineProps<{ padding?: 'none' | 'sm' | 'md' }>(), { padding: 'md' });
</script>

<template>
  <div
    class="rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80"
    :class="{ 'p-4': padding === 'md', 'p-3': padding === 'sm' }"
  >
    <slot />
  </div>
</template>
