<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import AiQuizHistoryList from '@/components/profile/AiQuizHistoryList.vue';
import DailyGoalRing from '@/components/profile/DailyGoalRing.vue';
import StatTile from '@/components/profile/StatTile.vue';
import WeeklyStreakRow from '@/components/profile/WeeklyStreakRow.vue';
import CloudSyncSettings from '@/components/settings/CloudSyncSettings.vue';
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
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <h1 class="mb-1 text-xl font-semibold text-text">Profile</h1>
    <p class="mb-6 text-sm text-card-muted">Your progress and history</p>

    <p v-if="!isReady" class="text-sm text-card-muted">
      Loading…
    </p>

    <template v-else>
      <section class="mb-6 flex flex-col gap-3">
        <DailyGoalRing />
        <WeeklyStreakRow />
      </section>

      <section class="mb-6 grid gap-3 grid-cols-4">
        <StatTile :value="statusCounts.new" label="New" value-class="text-primary">
          <template #icon><AppIcon icon-name="Copy" :size="20" /></template>
        </StatTile>
        <StatTile :value="statusCounts.easy" label="Easy" value-class="text-primary">
          <template #icon><AppIcon icon-name="Flash" :size="20" /></template>
        </StatTile>
        <StatTile :value="statusCounts.medium" label="Medium" value-class="text-secondary">
          <template #icon><AppIcon icon-name="Star1" :size="20" /></template>
        </StatTile>
        <StatTile :value="statusCounts.hard" label="Hard" value-class="text-accent">
          <template #icon>
            <svg viewBox="2 2 18 18" width="22" height="22" fill="currentColor" aria-hidden="true">
              <path
                d="M12 2c.3 2.6-1 4-2.4 5.5C8.2 8.9 7 10.5 7 13a5 5 0 0 0 10 0c0-1.7-.7-2.9-1.5-4 .1 1.3-.3 2.2-1 2.7.3-2.5-.6-4.4-2.5-5.7C12.4 4.7 12.2 3.3 12 2Z"
              />
            </svg>
          </template>
        </StatTile>
      </section>

      <CloudSyncSettings />

      <AiQuizHistoryList />
    </template>
  </div>
</template>
