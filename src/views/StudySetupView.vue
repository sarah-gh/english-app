<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import SessionSizeSelector from '@/components/study/SessionSizeSelector.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { type SessionSize, useStudySessionStore } from '@/stores/study-session-store';
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
const selectedViewMode = ref<CardViewMode>('practice');

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
      return true;
    }).length,
);

function startSession() {
  studySessionStore.start(
    {
      deckId: selectedDeckId.value || undefined,
      topicId: selectedTopicId.value || undefined,
      sessionSize: sessionSize.value,
    },
    selectedViewMode.value,
  );
  router.push('/study/session');
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <RouterLink to="/" class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary">
      <AppIcon icon-name="ArrowLeft" :size="14" />
      Dashboard
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-text">Study Session</h1>

    <p v-if="!isReady" class="text-sm text-text/50">
      Loading…
    </p>

    <template v-else>
      <section class="mb-6">
        <h2 class="mb-2 text-sm font-semibold text-text">View Mode</h2>
        <BaseSegmentedToggle
v-model="selectedViewMode" :options="[
          { value: 'study', label: 'Study' },
          { value: 'practice', label: 'Practice', color: 'secondary' },
        ]" />
        <p class="mt-2 text-xs text-text/50">
          {{
            selectedViewMode === 'study'
              ? 'Answers are shown upfront so you can read and study.'
              : 'Answers are hidden until you tap "Show Answer" or start swiping.'
          }}
        </p>
      </section>

      <section class="mb-6">
        <h2 class="mb-2 text-sm font-semibold text-text">Cards per batch</h2>
        <SessionSizeSelector v-model="sessionSize" />
        <p class="mt-2 text-xs text-text/50">
          Studied in chunks of 5, each followed by a quick matching quiz.
        </p>
      </section>

      <section class="mb-6 rounded-lg border border-text/20 p-4">
        <h2 class="mb-3 text-sm font-semibold text-text">Deck &amp; Topic</h2>

        <BaseSelect v-model="selectedDeckId" label="Deck" class="mb-3" :options="deckOptions" />

        <BaseSelect
v-model="selectedTopicId" label="Topic" class="mb-4" :disabled="!selectedDeckId"
          :options="topicOptions" />

        <p class="mb-3 text-xs text-text/50">
          Cards are prioritized automatically: never-studied first, then previously-missed cards,
          then Hard → Medium → Easy.
        </p>

        <button
type="button" :disabled="matchingCount === 0"
          class="w-full rounded bg-primary py-2.5 text-sm font-medium text-background hover:bg-primary/90 disabled:bg-primary/30"
          @click="startSession">
          Start ({{ Math.min(matchingCount, sessionSize) }} card{{ Math.min(matchingCount, sessionSize) === 1 ? '' : 's'
          }})
        </button>
      </section>
    </template>
  </div>
</template>
