<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  chunkNumber: number;
  cardIndexInChunk: number;
  chunkSize: number;
  totalStudied: number;
  totalSlots: number;
}>();

// Defensive: falls back to 0 if a caller ever passes `undefined`/`NaN` (props are typed as
// `number`, but nothing stops a bad value from slipping through at runtime), so the header never
// renders an empty "1/" fraction.
const safeTotalStudied = computed(() => props.totalStudied ?? 0);
const safeTotalSlots = computed(() => props.totalSlots ?? 0);

// `Math.max(1, ...)` keeps the denominator away from 0 so this can never divide-by-zero into NaN,
// independent of whatever the displayed "X/Y" text shows.
const progressPercent = computed(() =>
  Math.min(100, Math.round((safeTotalStudied.value / Math.max(1, safeTotalSlots.value)) * 100)),
);
</script>

<template>
  <div class="mx-auto mb-4 w-full max-w-sm">
    <div class="mb-1 flex items-center justify-between text-xs text-text/50">
      <span>Chunk {{ chunkNumber }} · Card {{ Math.min(cardIndexInChunk + 1, chunkSize) }}/{{ chunkSize }}</span>
      <span>{{ safeTotalStudied }}/{{ safeTotalSlots }}</span>
    </div>
    <div class="h-1.5 w-full overflow-hidden rounded-full bg-text/10">
      <div
        class="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
        :style="{ width: `${progressPercent}%` }"
      />
    </div>
  </div>
</template>
