import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { nextReviewStatus, type SwipeDirection } from '@/services/review/state-machine';
import { buildWeightedQueue } from '@/services/review/weighted-sampler';
import { useCardStore } from '@/stores/card-store';
import type { Card, ReviewStatus } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';
import { shuffle } from '@/utils/shuffle';

export type ReviewMode =
  | { type: 'category'; deckId: string | null; reviewStatus: ReviewStatus | null }
  | { type: 'weighted' };

interface LastSwipeAction {
  index: number;
  cardId: string;
  previousStatus: ReviewStatus;
}

export const useReviewSessionStore = defineStore('review-session', () => {
  const queue = ref<Card[]>([]);
  const currentIndex = ref(0);
  const lastAction = ref<LastSwipeAction | null>(null);
  const viewMode = ref<CardViewMode>('practice');

  const currentCard = computed(() => queue.value[currentIndex.value]);
  const nextCard = computed(() => queue.value[currentIndex.value + 1]);
  const isComplete = computed(
    () => queue.value.length > 0 && currentIndex.value >= queue.value.length,
  );
  const canUndo = computed(() => lastAction.value !== null);

  function start(mode: ReviewMode, initialViewMode: CardViewMode = 'practice'): void {
    const cardStore = useCardStore();
    const selected =
      mode.type === 'weighted'
        ? buildWeightedQueue(cardStore.cards)
        : shuffle(
            cardStore.cards.filter((card) => {
              if (mode.deckId && card.deckId !== mode.deckId) return false;
              if (mode.reviewStatus && card.reviewStatus !== mode.reviewStatus) return false;
              return true;
            }),
          );

    queue.value = selected;
    currentIndex.value = 0;
    lastAction.value = null;
    viewMode.value = initialViewMode;
  }

  /** §5.D: rolling back always restores the previous state, and the next swipe recalculates from there. */
  async function swipe(direction: SwipeDirection): Promise<void> {
    const card = currentCard.value;
    if (!card) return;

    const cardStore = useCardStore();
    const previousStatus = card.reviewStatus;
    const next = nextReviewStatus(previousStatus, direction);

    await cardStore.setReviewStatus(card.id, next);
    lastAction.value = { index: currentIndex.value, cardId: card.id, previousStatus };
    currentIndex.value += 1;
  }

  /** Capped at 1-card depth: only the most recent swipe can be undone. */
  async function undo(): Promise<void> {
    if (!lastAction.value) return;

    const cardStore = useCardStore();
    await cardStore.setReviewStatus(lastAction.value.cardId, lastAction.value.previousStatus);
    currentIndex.value = lastAction.value.index;
    lastAction.value = null;
  }

  return {
    queue,
    currentIndex,
    currentCard,
    nextCard,
    isComplete,
    canUndo,
    viewMode,
    start,
    swipe,
    undo,
  };
});
