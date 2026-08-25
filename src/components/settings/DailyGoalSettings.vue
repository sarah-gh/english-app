<script setup lang="ts">
import { onMounted, ref } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useAnalyticsStore } from '@/stores/analytics-store';

const analyticsStore = useAnalyticsStore();

const goalDraft = ref(String(analyticsStore.dailyGoal));
const status = ref('');

onMounted(async () => {
  await analyticsStore.ensureLoaded();
  goalDraft.value = String(analyticsStore.dailyGoal);
});

async function saveGoal() {
  const parsed = Number(goalDraft.value);
  if (!Number.isFinite(parsed) || parsed <= 0) return;

  await analyticsStore.setDailyGoal(Math.round(parsed));
  goalDraft.value = String(analyticsStore.dailyGoal);
  status.value = 'Saved';
  setTimeout(() => (status.value = ''), 2000);
}
</script>

<template>
  <BaseCard class="mb-6">
    <h2 class="mb-1 text-sm font-semibold text-text">Daily Goal</h2>
    <p class="mb-3 text-xs text-text/50">
      Number of cards to review each day — shown as a progress ring on your Profile.
    </p>
    <div class="flex items-end gap-3">
      <BaseInput
        v-model="goalDraft"
        type="number"
        label="Cards per day"
        class="w-28"
        @keyup.enter="saveGoal"
      />
      <BaseButton
        variant="primary"
        size="sm"
        @click="saveGoal"
      >
        Save
      </BaseButton>
      <span
        v-if="status"
        class="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-background"
      >
        ✓ {{ status }}
      </span>
    </div>
  </BaseCard>
</template>
