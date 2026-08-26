<script setup lang="ts">
import { ref } from 'vue';
import { useAnalyticsStore } from '@/stores/analytics-store';
import { useDeckStore } from '@/stores/deck-store';

const analyticsStore = useAnalyticsStore();
const deckStore = useDeckStore();

const expandedId = ref('');

function toggleExpanded(id: string) {
  expandedId.value = expandedId.value === id ? '' : id;
}

function deckNames(deckIds: string[]): string {
  const names = deckIds.map((id) => deckStore.getById(id)?.name).filter((name): name is string => Boolean(name));
  return names.length > 0 ? names.join(', ') : 'Mixed decks';
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function modeLabel(mode?: 'multiple-choice' | 'open-ended'): string {
  return mode === 'open-ended' ? 'Open-Ended' : 'Multiple Choice';
}
</script>

<template>
  <div class="rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80">
    <p class="px-4 pt-3 text-xs font-medium text-text/70">AI Quiz History</p>
    <ul class="mt-1 divide-y divide-text/10">
      <li v-for="result in analyticsStore.aiQuizHistory.slice(0, 5)" :key="result.id">
        <button
          type="button"
          class="flex w-full items-center justify-between px-4 py-3 text-left"
          :disabled="!result.questions || result.questions.length === 0"
          @click="toggleExpanded(result.id)"
        >
          <div class="min-w-0">
            <p class="truncate text-sm text-text">{{ deckNames(result.deckIds) }}</p>
            <p class="text-xs text-text/50">
              {{ formatDate(result.createdAt) }} · {{ result.cardCount }} card{{ result.cardCount === 1 ? '' : 's' }}
              · {{ modeLabel(result.mode) }}
            </p>
          </div>
          <span class="flex shrink-0 items-center gap-1.5">
            <span class="text-sm font-semibold text-primary">{{ result.score }}/{{ result.total }}</span>
            <AppIcon
              v-if="result.questions && result.questions.length > 0"
              icon-name="ArrowDown2"
              :size="14"
              class="text-text/40 transition-transform"
              :class="{ 'rotate-180': expandedId === result.id }"
            />
          </span>
        </button>

        <div v-if="expandedId === result.id && result.questions" class="space-y-3 px-4 pb-4">
          <div v-for="(detail, index) in result.questions" :key="index" class="rounded-lg border border-text/10 p-3">
            <p class="mb-1 text-xs font-medium text-text/50">Q{{ index + 1 }} · from “{{ detail.cardTitle }}”</p>
            <p class="mb-1.5 text-xs font-medium text-text">{{ detail.question }}</p>
            <p class="mb-1 text-xs text-text/70">Your answer: {{ detail.userAnswer || '(no answer)' }}</p>

            <template v-if="result.mode === 'open-ended'">
              <p v-if="detail.score !== undefined" class="mb-1 text-xs font-semibold text-primary">{{ detail.score }}/100</p>
              <p v-if="detail.feedback" class="mb-1 text-xs text-text/70">{{ detail.feedback }}</p>
              <p v-if="detail.sampleAnswer" class="text-xs text-text/60">Sample: {{ detail.sampleAnswer }}</p>
            </template>
            <template v-else>
              <p
                class="text-xs font-semibold"
                :class="detail.isCorrect ? 'text-primary' : 'text-danger'"
              >
                {{ detail.isCorrect ? 'Correct' : `Incorrect · Correct answer: ${detail.correctAnswer}` }}
              </p>
            </template>
          </div>
        </div>
      </li>
      <li v-if="analyticsStore.aiQuizHistory.length === 0" class="px-4 py-4 text-center text-xs text-text/35">
        No AI quizzes taken yet.
      </li>
    </ul>
  </div>
</template>
