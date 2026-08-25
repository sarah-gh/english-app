<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AiQuizHistoryList from '@/components/profile/AiQuizHistoryList.vue';
import DailyGoalRing from '@/components/profile/DailyGoalRing.vue';
import StatTile from '@/components/profile/StatTile.vue';
import WeeklyStreakRow from '@/components/profile/WeeklyStreakRow.vue';
import { useAnalyticsStore } from '@/stores/analytics-store';
import { useCardStore } from '@/stores/card-store';

const cardStore = useCardStore();
const analyticsStore = useAnalyticsStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), analyticsStore.fetchAll()]);
  isReady.value = true;
});

const statusCounts = computed(() => ({
  new: cardStore.byReviewStatus('new').length,
  easy: cardStore.byReviewStatus('easy').length,
  medium: cardStore.byReviewStatus('medium').length,
  hard: cardStore.byReviewStatus('hard').length,
}));
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6">
    <h1 class="mb-1 text-xl font-semibold text-text">Profile</h1>
    <p class="mb-6 text-sm text-text/50">Your progress and history</p>

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>

    <template v-else>
      <section class="mb-6 flex flex-col gap-3">
        <DailyGoalRing />
        <WeeklyStreakRow />
      </section>

      <section class="mb-6 grid gap-3 grid-cols-4">
        <StatTile :value="statusCounts.new" label="New" />
        <StatTile :value="statusCounts.easy" label="Easy" />
        <StatTile :value="statusCounts.medium" label="Medium" value-class="text-secondary" />
        <StatTile :value="statusCounts.hard" label="Hard" value-class="text-accent" />
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold text-text">AI Quiz History</h2>
        <AiQuizHistoryList />
      </section>
    </template>
  </div>
</template>
