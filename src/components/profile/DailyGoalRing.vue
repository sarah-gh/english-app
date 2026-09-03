<script setup lang="ts">
import { computed, ref } from 'vue';
import AppIcon from '@/components/app/AppIcon.vue';
import { useAnalyticsStore } from '@/stores/analytics-store';

const analyticsStore = useAnalyticsStore();

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const progress = computed(() =>
  analyticsStore.dailyGoal > 0 ? Math.min(1, analyticsStore.todayCount / analyticsStore.dailyGoal) : 0,
);
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value));

const goalMessage = computed(() => {
  if (progress.value >= 1) return "Goal reached! Great job today.";
  if (analyticsStore.todayCount === 0) {
    return `You're just getting started! Study ${analyticsStore.dailyGoal} cards daily to build a habit.`;
  }
  const remaining = analyticsStore.dailyGoal - analyticsStore.todayCount;
  return `Keep going! ${remaining} card${remaining === 1 ? '' : 's'} left to hit today's goal.`;
});

const isEditingGoal = ref(false);
const goalDraft = ref(String(analyticsStore.dailyGoal));

function startEditGoal() {
  goalDraft.value = String(analyticsStore.dailyGoal);
  isEditingGoal.value = true;
}

async function saveGoal() {
  const parsed = Number(goalDraft.value);
  if (Number.isFinite(parsed) && parsed > 0) {
    await analyticsStore.setDailyGoal(Math.round(parsed));
  }
  isEditingGoal.value = false;
}
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl border border-slate-600 bg-card-surface p-4">
    <img
      src="/goal.png"
      alt=""
      class="pointer-events-none absolute inset-y-0 right-0 hidden h-full w-32 object-cover object-right opacity-90 mask-[linear-gradient(to_right,transparent,black_55%)] dark:block"
    />

    <div class="relative z-10 flex items-center gap-4">
      <div class="relative h-24 w-24 shrink-0">
        <svg viewBox="0 0 100 100" class="h-full w-full -rotate-90">
          <circle cx="50" cy="50" :r="RADIUS" fill="none" stroke="currentColor" stroke-width="8" class="text-slate-600" />
          <circle
cx="50" cy="50" :r="RADIUS" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"
            class="text-primary transition-[stroke-dashoffset] duration-500 ease-out" :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset" />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <span class="text-2xl font-semibold text-text">{{ analyticsStore.todayCount }}</span>
          <span class="text-[10px] text-card-muted">of {{ analyticsStore.dailyGoal }}</span>
        </div>
      </div>

      <div class="min-w-0 flex-1">
        <p class="text-base font-semibold text-text">Daily Goal</p>
        <p class="mt-1 text-[9px] w-2/3 leading-relaxed text-card-muted">{{ goalMessage }}</p>

        <div v-if="isEditingGoal" class="mt-3 flex items-center gap-2">
          <input
v-model="goalDraft" type="number" min="1"
            class="w-16 rounded-lg border border-slate-600 bg-background px-2 py-1 text-center text-xs text-text focus:border-primary focus:outline-none"
            @keyup.enter="saveGoal" />
          <button type="button" class="text-xs font-medium text-primary underline underline-offset-2" @click="saveGoal">
            Save
          </button>
        </div>
        <button
v-else type="button"
          class="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/40 px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10"
          @click="startEditGoal">
          <AppIcon icon-name="Edit2" :size="14" />
          Edit Goal
        </button>
      </div>
    </div>
  </div>
</template>
