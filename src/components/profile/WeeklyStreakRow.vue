<script setup lang="ts">
import AppIcon from '@/components/app/AppIcon.vue';
import { useAnalyticsStore } from '@/stores/analytics-store';
import type { WeekStreakDay } from '@/stores/analytics-store';

const analyticsStore = useAnalyticsStore();

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function dateFor(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function weekdayLabelFor(date: string): string {
  return WEEKDAY_LABELS[dateFor(date).getDay()];
}

function dateLabelFor(date: string): string {
  const [, month, day] = date.split('-').map(Number);
  return `${month}/${day}`;
}

function circleClasses(day: WeekStreakDay): string {
  if (day.cardsStudied > 0 && day.isToday) return 'bg-primary text-background';
  if (day.cardsStudied > 0) return 'border border-primary text-primary';
  if (day.isToday) return 'border-2 border-primary text-primary';
  return 'border border-slate-600 text-card-muted';
}

function columnClasses(day: WeekStreakDay): string {
  return day.isToday ? 'border border-primary/40 bg-primary/5' : '';
}
</script>

<template>
  <div class="rounded-2xl border border-slate-600 bg-card-surface p-4">
    <div class="mb-3 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AppIcon icon-name="CalendarTick" :size="18" />
        </span>
        <p class="text-base font-semibold text-card-gold font-serif">This Week</p>
      </div>
      <span class="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
        {{ analyticsStore.activeDaysThisWeek }}/7 active days
      </span>
    </div>
    <div class="flex justify-between">
      <div
        v-for="day in analyticsStore.weekStreak"
        :key="day.date"
        class="flex flex-col items-center gap-0.5 rounded-2xl p-1 sm:gap-1 sm:p-2"
        :class="columnClasses(day)"
      >
        <span
          class="text-[9px] font-semibold uppercase tracking-wide sm:text-xs"
          :class="day.isToday ? 'text-primary' : 'text-card-muted'"
        >
          {{ weekdayLabelFor(day.date) }}
        </span>
        <div
          class="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors sm:h-12 sm:w-12 sm:text-xs"
          :class="circleClasses(day)"
        >
          {{ day.cardsStudied > 0 ? day.cardsStudied : '' }}
        </div>
        <span class="text-[9px] sm:text-xs" :class="day.isToday ? 'text-primary' : 'text-card-muted'">
          {{ dateLabelFor(day.date) }}
        </span>
      </div>
    </div>
    <div class="my-4 border-t border-text/10" />
    <p class="flex items-center justify-center gap-2 text-xs text-card-muted">
      <span aria-hidden="true">✨</span>
      Keep it up! You're building a great habit.
    </p>
  </div>
</template>
