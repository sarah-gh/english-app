<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAnalyticsStore } from '@/stores/analytics-store';

const analyticsStore = useAnalyticsStore();

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const progress = computed(() =>
  analyticsStore.dailyGoal > 0 ? Math.min(1, analyticsStore.todayCount / analyticsStore.dailyGoal) : 0,
);
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value));

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
  <div class="flex flex-col items-center gap-2 rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80 p-4">
    <div class="relative h-28 w-28">
      <svg
        viewBox="0 0 100 100"
        class="h-full w-full -rotate-90"
      >
        <circle
          cx="50"
          cy="50"
          :r="RADIUS"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          class="text-text/10"
        />
        <circle
          cx="50"
          cy="50"
          :r="RADIUS"
          fill="none"
          stroke="currentColor"
          stroke-width="8"
          stroke-linecap="round"
          class="text-primary transition-[stroke-dashoffset] duration-500 ease-out"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="dashOffset"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-lg font-semibold text-text">{{ analyticsStore.todayCount }}</span>
        <span class="text-[10px] text-text/50">of {{ analyticsStore.dailyGoal }}</span>
      </div>
    </div>
    <p class="text-xs font-medium text-text/70">Daily Goal</p>

    <div
      v-if="isEditingGoal"
      class="flex items-center gap-2"
    >
      <input
        v-model="goalDraft"
        type="number"
        min="1"
        class="w-16 rounded border border-text/20 px-2 py-1 text-center text-xs focus:border-primary focus:outline-none"
        @keyup.enter="saveGoal"
      />
      <button
        type="button"
        class="text-xs font-medium text-primary underline underline-offset-2"
        @click="saveGoal"
      >
        Save
      </button>
    </div>
    <button
      v-else
      type="button"
      class="text-xs text-text/40 underline underline-offset-2 hover:text-primary"
      @click="startEditGoal"
    >
      Edit goal
    </button>
  </div>
</template>
