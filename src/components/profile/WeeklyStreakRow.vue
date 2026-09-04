<script setup lang="ts">
import { useAnalyticsStore } from '@/stores/analytics-store';

const analyticsStore = useAnalyticsStore();

function labelFor(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
}
</script>

<template>
  <div class="rounded-2xl border border-slate-600 bg-card-surface p-4">
    <div class="mb-3 flex items-center justify-between">
      <p class="text-base font-semibold text-card-gold font-serif">This Week</p>
      <span class="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        {{ analyticsStore.activeDaysThisWeek }}/7 active days
      </span>
    </div>
    <div class="flex justify-between gap-1">
      <div v-for="day in analyticsStore.weekStreak" :key="day.date" class="flex flex-col items-center gap-1.5">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition-colors"
          :class="[
              day.cardsStudied > 0
              ? 'bg-primary text-background'
              : day.isToday
              ? 'border-2 border-primary text-primary'
              : 'border border-slate-600 text-card-muted',]">
          {{ day.cardsStudied > 0 ? day.cardsStudied : '' }}
        </div>
        <span class="text-[10px] text-card-muted">{{ labelFor(day.date) }}</span>
      </div>
    </div>
  </div>
</template>
