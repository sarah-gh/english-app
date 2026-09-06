<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useAnalyticsStore } from '@/stores/analytics-store';

const analyticsStore = useAnalyticsStore();

const MIN_GOAL = 1;

const goalDraft = ref(analyticsStore.dailyGoal);
const status = ref('');

onMounted(async () => {
  await analyticsStore.ensureLoaded();
  goalDraft.value = analyticsStore.dailyGoal;
});

const canDecrement = computed(() => goalDraft.value > MIN_GOAL);

function decrement() {
  if (canDecrement.value) goalDraft.value -= 1;
}

function increment() {
  goalDraft.value += 1;
}

async function saveGoal() {
  if (!Number.isFinite(goalDraft.value) || goalDraft.value < MIN_GOAL) return;

  await analyticsStore.setDailyGoal(Math.round(goalDraft.value));
  goalDraft.value = analyticsStore.dailyGoal;
  status.value = 'Saved';
  setTimeout(() => (status.value = ''), 2000);
}
</script>

<template>
  <SettingsSectionCard
    title="Daily Goal"
    badge-class="bg-orange-400/10 text-orange-400"
    description="Number of cards to review each day, shown as a progress ring on your Profile."
  >
    <template #icon>
      <AppIcon
        icon-name="Discover"
        :size="18"
      />
    </template>
    <div class="flex items-center gap-3">
      <div
        class="border-text/10 flex items-center gap-1 rounded-xl border bg-black/5 p-1 dark:bg-slate-950/40"
      >
        <button
          type="button"
          aria-label="Decrease daily goal"
          class="text-text/60 hover:bg-text/10 hover:text-text flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
          :disabled="!canDecrement"
          @click="decrement"
        >
          <AppIcon
            icon-name="Minus"
            :size="14"
          />
        </button>
        <span class="text-text w-10 text-center text-sm font-semibold">{{ goalDraft }}</span>
        <button
          type="button"
          aria-label="Increase daily goal"
          class="text-text/60 hover:bg-text/10 hover:text-text flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          @click="increment"
        >
          <AppIcon
            icon-name="Add"
            :size="14"
          />
        </button>
      </div>
      <BaseButton
        variant="primary"
        size="sm"
        class="rounded-xl!"
        @click="saveGoal"
      >
        <AppIcon
          icon-name="TickCircle"
          :size="14"
        />
        Save
      </BaseButton>
      <span
        v-if="status"
        class="bg-primary text-background inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      >
        ✓ {{ status }}
      </span>
    </div>
  </SettingsSectionCard>
</template>
