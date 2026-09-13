<script setup lang="ts">
withDefaults(defineProps<{ rows?: number }>(), { rows: 6 });
</script>

<template>
  <div class="max-h-130 space-y-3 overflow-hidden px-1">
    <div
      v-for="row in rows"
      :key="row"
      class="border-text/10 animate-pulse rounded-xl border bg-white/80 p-4 dark:bg-slate-900/80"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1 space-y-2">
          <div class="bg-text/10 h-4 w-2/3 rounded" />
          <div class="bg-text/10 h-3 w-1/3 rounded" />
        </div>
        <div class="bg-text/10 h-8 w-16 shrink-0 rounded-full" />
      </div>
    </div>
  </div>
</template>
