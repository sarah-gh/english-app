<script setup lang="ts">
import { useAnalyticsStore } from '@/stores/analytics-store';

const analyticsStore = useAnalyticsStore();

function labelFor(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
}
</script>

<template>
  <div class="rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80 p-4">
    <div class="mb-3 flex items-center justify-between">
      <p class="text-xs font-medium text-text/70">This Week</p>
      <p class="text-xs text-text/50">{{ analyticsStore.activeDaysThisWeek }}/7 active days</p>
    </div>
    <div class="flex justify-between gap-1">
      <div v-for="day in analyticsStore.weekStreak" :key="day.date" class="flex flex-col items-center gap-1">
        <div
class="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold" :class="[
          day.cardsStudied > 0 ? 'bg-primary text-background' : 'bg-text/8 text-text/30',
          day.isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : '',
        ]">
          {{ day.cardsStudied > 0 ? day.cardsStudied : '' }}
        </div>
        <span class="text-[10px] text-text/40">{{ labelFor(day.date) }}</span>
      </div>
    </div>
  </div>
</template>
