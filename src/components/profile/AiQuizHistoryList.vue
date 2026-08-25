<script setup lang="ts">
import { useAnalyticsStore } from '@/stores/analytics-store';
import { useDeckStore } from '@/stores/deck-store';

const analyticsStore = useAnalyticsStore();
const deckStore = useDeckStore();

function deckNames(deckIds: string[]): string {
  const names = deckIds.map((id) => deckStore.getById(id)?.name).filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(', ') : 'Mixed decks';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
</script>

<template>
  <div class="rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80">
    <p class="px-4 pt-3 text-xs font-medium text-text/70">AI Quiz History</p>
    <ul class="mt-1 divide-y divide-text/10">
      <li
        v-for="result in analyticsStore.aiQuizHistory.slice(0, 5)"
        :key="result.id"
        class="flex items-center justify-between px-4 py-3"
      >
        <div class="min-w-0">
          <p class="truncate text-sm text-text">{{ deckNames(result.deckIds) }}</p>
          <p class="text-xs text-text/50">
            {{ formatDate(result.createdAt) }} · {{ result.cardCount }} card{{ result.cardCount === 1 ? '' : 's' }}
          </p>
        </div>
        <span class="shrink-0 text-sm font-semibold text-primary">{{ result.score }}/{{ result.total }}</span>
      </li>
      <li
        v-if="analyticsStore.aiQuizHistory.length === 0"
        class="px-4 py-4 text-center text-xs text-text/35"
      >
        No AI quizzes taken yet.
      </li>
    </ul>
  </div>
</template>
