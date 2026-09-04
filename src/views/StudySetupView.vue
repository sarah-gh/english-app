<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BorderedCard from '@/components/common/BorderedCard.vue';
import SessionSizeSelector from '@/components/study/SessionSizeSelector.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { type ReviewPriorityFilter, type SessionSize, useStudySessionStore } from '@/stores/study-session-store';
import { useTopicStore } from '@/stores/topic-store';
import type { CardViewMode } from '@/types/view-mode';

const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
const studySessionStore = useStudySessionStore();

const isReady = ref(false);
const selectedDeckId = ref('');
const selectedTopicId = ref('');
const sessionSize = ref<SessionSize>(20);
const selectedViewMode = ref<CardViewMode>('study');
const reviewStatusFilter = ref<ReviewPriorityFilter>('default');

const REVIEW_PRIORITY_OPTIONS: { value: ReviewPriorityFilter; label: string }[] = [
  { value: 'default', label: 'Default / Mixed Priority (Recommended)' },
  { value: 'new', label: 'New Cards Only' },
  { value: 'hard', label: 'Hard Cards Only' },
  { value: 'medium', label: 'Medium Cards Only' },
  { value: 'easy', label: 'Easy Cards Only' },
];

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), topicStore.ensureLoaded()]);
  isReady.value = true;
});

/** Clears the topic filter when it no longer belongs to the selected deck. */
watch(selectedDeckId, (deckId) => {
  if (!selectedTopicId.value) return;
  if (!topicStore.byDeck(deckId).some((topic) => topic.id === selectedTopicId.value)) {
    selectedTopicId.value = '';
  }
});

const topicsForSelectedDeck = computed(() =>
  selectedDeckId.value ? topicStore.byDeck(selectedDeckId.value) : [],
);

const deckOptions = computed(() => [
  { value: '', label: 'All decks' },
  ...deckStore.decks.map((deck) => ({ value: deck.id, label: deck.name })),
]);

const topicOptions = computed(() => [
  { value: '', label: 'All topics' },
  ...topicsForSelectedDeck.value.map((topic) => ({ value: topic.id, label: topic.name })),
]);

const matchingCount = computed(
  () =>
    cardStore.cards.filter((card) => {
      if (selectedDeckId.value && card.deckId !== selectedDeckId.value) return false;
      if (selectedTopicId.value && card.topicId !== selectedTopicId.value) return false;
      if (reviewStatusFilter.value !== 'default' && card.reviewStatus !== reviewStatusFilter.value) return false;
      // Matches the same Practice-mode eligibility rule `studySessionStore.start` applies, so this
      // count doesn't promise more cards than the session will actually contain.
      if (selectedViewMode.value === 'practice' && card.studyCount === 0) return false;
      return true;
    }).length,
);

function startSession() {
  studySessionStore.start(
    {
      deckId: selectedDeckId.value || undefined,
      topicId: selectedTopicId.value || undefined,
      sessionSize: sessionSize.value,
      reviewStatusFilter: reviewStatusFilter.value,
    },
    selectedViewMode.value,
  );
  router.push('/study/session');
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6">
    <RouterLink to="/" class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary">
      <AppIcon icon-name="ArrowLeft" :size="14" />
      Dashboard
    </RouterLink>
    <h1 class="mb-6 text-2xl font-bold font-serif text-text">Study Session</h1>

    <p v-if="!isReady" class="text-sm text-text/50">
      Loading…
    </p>

    <template v-else>
      <BorderedCard>
        <section class="mb-6">
          <h2 class="mb-2 text-base font-semibold text-text">View Mode</h2>
          <BaseSegmentedToggle
            v-model="selectedViewMode"
            class="bg-card-definition"
            :options="[
              { value: 'study', label: 'Study', color: 'gold' },
              { value: 'practice', label: 'Practice', color: 'gold' },
            ]"
          />
          <p class="mt-2 text-xs text-card-muted">
            {{
              selectedViewMode === 'study'
                ? 'Answers are shown upfront so you can read and study.'
                : 'Answers are hidden until you tap "Show Answer" or start swiping.'
            }}
          </p>
          <p
            v-if="selectedViewMode === 'practice'"
            class="mt-2 flex items-start gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary"
          >
            <AppIcon icon-name="Danger" :size="14" class="mt-0.5 shrink-0" />
            Only cards you have studied at least once will appear in Practice mode.
          </p>
        </section>

        <section class="mb-6">
          <h2 class="mb-2 text-base font-semibold text-text">Cards per batch</h2>
          <SessionSizeSelector v-model="sessionSize" />
          <p class="mt-2 text-xs text-card-muted">
            Studied in chunks of 5, each followed by a quick matching quiz.
          </p>
        </section>

        <section class="rounded-xl border border-card-gold/10 bg-card-definition p-4 dark:bg-[#0f282c]">
          <h2 class="mb-3 text-base font-semibold text-card-gold">Deck &amp; Topic</h2>

          <BaseSelect
            v-model="selectedDeckId"
            label="Deck"
            class="mb-3"
            :options="deckOptions"
            trigger-class="bg-card-surface border-card-gold/20"
            chevron-class="text-card-gold"
          />

          <BaseSelect
            v-model="selectedTopicId"
            label="Topic"
            class="mb-5"
            :disabled="!selectedDeckId"
            :options="topicOptions"
            trigger-class="bg-card-surface border-card-gold/20"
            chevron-class="text-card-gold"
          />

          <BaseSelect
            v-model="reviewStatusFilter"
            label="Review Priority / Status"
            class="mb-5"
            :options="REVIEW_PRIORITY_OPTIONS"
            trigger-class="bg-card-surface border-card-gold/20"
            chevron-class="text-card-gold"
          />

          <button
            type="button"
            :disabled="matchingCount === 0"
            class="relative w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-background hover:bg-primary/90 disabled:bg-primary/30"
            @click="startSession"
          >
            Start ({{ Math.min(matchingCount, sessionSize) }} card{{
              Math.min(matchingCount, sessionSize) === 1 ? '' : 's'
            }})
          </button>
        </section>
      </BorderedCard>
    </template>
  </div>
</template>
