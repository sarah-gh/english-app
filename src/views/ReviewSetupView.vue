<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useReviewSessionStore } from '@/stores/review-session-store';
import type { ReviewStatus } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';

const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const reviewSessionStore = useReviewSessionStore();

const isReady = ref(false);
const selectedDeckId = ref('');
const selectedStatus = ref<ReviewStatus | ''>('');
const selectedViewMode = ref<CardViewMode>('practice');

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded()]);
  isReady.value = true;
});

const matchingCount = computed(
  () =>
    cardStore.cards.filter((card) => {
      if (selectedDeckId.value && card.deckId !== selectedDeckId.value) return false;
      if (selectedStatus.value && card.reviewStatus !== selectedStatus.value) return false;
      return true;
    }).length,
);

const weightedCount = computed(
  () => cardStore.cards.filter((card) => card.reviewStatus !== 'new').length,
);

function startCategoryReview() {
  reviewSessionStore.start(
    {
      type: 'category',
      deckId: selectedDeckId.value || null,
      reviewStatus: selectedStatus.value || null,
    },
    selectedViewMode.value,
  );
  router.push('/review/session');
}

function startWeightedReview() {
  reviewSessionStore.start({ type: 'weighted' }, selectedViewMode.value);
  router.push('/review/session');
}
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-6">
    <RouterLink
      to="/"
      class="mb-4 inline-block text-sm text-gray-500 hover:text-black"
    >
      ← Dashboard
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-black">Review Session</h1>

    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>

    <template v-else>
      <section class="mb-6">
        <h2 class="mb-2 text-sm font-semibold text-black">View Mode</h2>
        <BaseSegmentedToggle
          v-model="selectedViewMode"
          :options="[
            { value: 'study', label: 'Study' },
            { value: 'practice', label: 'Practice' },
          ]"
        />
        <p class="mt-2 text-xs text-gray-500">
          {{
            selectedViewMode === 'study'
              ? 'Answers are shown upfront so you can read and study.'
              : 'Answers are hidden until you tap "Show Answer" or start swiping.'
          }}
        </p>
      </section>

      <section class="mb-6 rounded-lg border border-gray-300 p-4">
        <h2 class="mb-3 text-sm font-semibold text-black">Category Review</h2>

        <label
          for="review-deck"
          class="mb-1 block text-xs font-medium text-gray-600"
          >Deck</label
        >
        <select
          id="review-deck"
          v-model="selectedDeckId"
          class="mb-3 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        >
          <option value="">All decks</option>
          <option
            v-for="deck in deckStore.decks"
            :key="deck.id"
            :value="deck.id"
          >
            {{ deck.name }}
          </option>
        </select>

        <label
          for="review-tier"
          class="mb-1 block text-xs font-medium text-gray-600"
          >Tier</label
        >
        <select
          id="review-tier"
          v-model="selectedStatus"
          class="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        >
          <option value="">All tiers</option>
          <option value="new">New</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <button
          type="button"
          :disabled="matchingCount === 0"
          class="w-full rounded bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-300"
          @click="startCategoryReview"
        >
          Start ({{ matchingCount }} card{{ matchingCount === 1 ? '' : 's' }})
        </button>
      </section>

      <section class="rounded-lg border border-gray-300 p-4">
        <h2 class="mb-1 text-sm font-semibold text-black">Weighted Random Review</h2>
        <p class="mb-4 text-xs text-gray-500">
          Prioritizes Hard cards (~50%), Medium (~30%), then Easy (~20%). New cards aren't
          included.
        </p>
        <button
          type="button"
          :disabled="weightedCount === 0"
          class="w-full rounded border border-black py-2.5 text-sm font-medium text-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
          @click="startWeightedReview"
        >
          Start Weighted Review ({{ weightedCount }} card{{ weightedCount === 1 ? '' : 's' }})
        </button>
      </section>
    </template>
  </div>
</template>
