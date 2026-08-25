<script setup lang="ts">
defineProps<{
  chunkNumber: number;
  cardIndexInChunk: number;
  chunkSize: number;
  totalStudied: number;
  totalSlots: number;
}>();
</script>

<template>
  <div class="mx-auto mb-2 w-full max-w-sm">
    <div class="mb-1 flex items-center justify-between text-xs text-text/50">
      <span>Chunk {{ chunkNumber }} · Card {{ Math.min(cardIndexInChunk + 1, chunkSize) }}/{{ chunkSize }}</span>
      <span>{{ totalStudied }}/{{ totalSlots }}</span>
    </div>
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-text/10">
      <div
        class="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        :style="{ width: `${totalSlots > 0 ? Math.min(100, (totalStudied / totalSlots) * 100) : 0}%` }"
      />
    </div>
  </div>
</template>
