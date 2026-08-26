<script setup lang="ts">
defineProps<{ count: number }>();
</script>

<template>
  <span
    class="inline-flex min-w-[1.5rem] shrink-0 items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-xs font-semibold text-primary"
  >
    {{ count }}
  </span>
</template>
