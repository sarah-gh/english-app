<script setup lang="ts">
withDefaults(defineProps<{ padding?: 'none' | 'sm' | 'md' }>(), { padding: 'md' });
</script>

<template>
  <div
    class="rounded-lg border border-gray-300"
    :class="{ 'p-4': padding === 'md', 'p-3': padding === 'sm' }"
  >
    <slot />
  </div>
</template>
