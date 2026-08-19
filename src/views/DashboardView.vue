<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useReviewSessionStore } from '@/stores/review-session-store';

const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const reviewSessionStore = useReviewSessionStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded()]);
  isReady.value = true;
});

const hasWeightedCards = computed(
  () => cardStore.cards.filter((card) => card.reviewStatus !== 'new').length > 0,
);

function startQuickWeightedReview() {
  reviewSessionStore.start({ type: 'weighted' });
  router.push('/review/session');
}

const statusCounts = computed(() => ({
  new: cardStore.byReviewStatus('new').length,
  easy: cardStore.byReviewStatus('easy').length,
  medium: cardStore.byReviewStatus('medium').length,
  hard: cardStore.byReviewStatus('hard').length,
}));

function deckCardCount(deckId: string): number {
  return cardStore.byDeck(deckId).length;
}
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-6">
    <h1 class="mb-1 text-xl font-semibold text-black">Flashcards</h1>
    <p class="mb-6 text-sm text-gray-500">Your offline vocabulary trainer</p>

    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>

    <template v-else>
      <section class="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BaseCard class="text-center">
          <p class="text-2xl font-semibold text-black">{{ statusCounts.new }}</p>
          <p class="text-xs text-gray-500">New</p>
        </BaseCard>
        <BaseCard class="text-center">
          <p class="text-2xl font-semibold text-black">{{ statusCounts.easy }}</p>
          <p class="text-xs text-gray-500">Easy</p>
        </BaseCard>
        <BaseCard class="text-center">
          <p class="text-2xl font-semibold text-black">{{ statusCounts.medium }}</p>
          <p class="text-xs text-gray-500">Medium</p>
        </BaseCard>
        <BaseCard class="text-center">
          <p class="text-2xl font-semibold text-black">{{ statusCounts.hard }}</p>
          <p class="text-xs text-gray-500">Hard</p>
        </BaseCard>
      </section>

      <BaseButton
        variant="primary"
        block
        :disabled="!hasWeightedCards"
        class="mb-8"
        @click="startQuickWeightedReview"
      >
        Quick Start Weighted Review
      </BaseButton>

      <section class="mb-8">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-black">Decks</h2>
          <BaseButton
            variant="link"
            size="sm"
            to="/cards/new"
          >
            + Add Card
          </BaseButton>
        </div>
        <BaseCard padding="none">
          <ul class="divide-y divide-gray-200">
            <li
              v-for="deck in deckStore.decks"
              :key="deck.id"
            >
              <RouterLink
                :to="`/cards?deckId=${deck.id}`"
                class="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <span class="text-sm text-black">{{ deck.name }}</span>
                <span class="text-xs text-gray-500">{{ deckCardCount(deck.id) }} cards</span>
              </RouterLink>
            </li>
            <li
              v-if="deckStore.decks.length === 0"
              class="px-4 py-3 text-sm text-gray-400"
            >
              No decks yet.
            </li>
          </ul>
        </BaseCard>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold text-black">Sections</h2>
        <div class="grid grid-cols-2 gap-3">
          <BaseButton
            variant="tile"
            to="/cards"
          >
            Browse Cards
          </BaseButton>
          <BaseButton
            variant="tile"
            to="/cards/new"
          >
            Card Creator
          </BaseButton>
          <BaseButton
            variant="tile"
            to="/decks"
          >
            Deck Management
          </BaseButton>
          <BaseButton
            variant="tile"
            to="/review"
          >
            Review Session
          </BaseButton>
          <BaseButton
            variant="tile"
            to="/ai-quiz"
          >
            AI Quiz Generator
          </BaseButton>
          <BaseButton
            variant="tile"
            to="/settings"
          >
            Settings
          </BaseButton>
        </div>
      </section>
    </template>
  </div>
</template>
