import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { dailyStatRepository } from '@/db/repositories';
import { buildMatchingQuizChunk, type MatchingQuizChunk } from '@/services/review/matching-quiz';
import { buildPriorityQueue } from '@/services/review/priority-queue';
import { nextReviewStatus, type SwipeDirection } from '@/services/review/state-machine';
import { useCardStore } from '@/stores/card-store';
import type { Card, ReviewStatus } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';

export type SessionSize = 5 | 10 | 15 | 20;

export interface StudySessionConfig {
  deckId?: string;
  topicId?: string;
  sessionSize: SessionSize;
}

export type StudySessionPhase = 'studying' | 'quiz' | 'summary';

interface LastSwipeAction {
  index: number;
  cardId: string;
  previousStatus: ReviewStatus;
}

export interface MatchResult {
  cardId: string;
  correct: boolean;
}

/**
 * Drives the chunked study flow: a prioritized, capped queue is consumed 5 cards at a time via
 * the swipe mechanics (unchanged from the old review-session-store), and every completed chunk
 * hands off to a 2-column matching quiz before the next chunk starts. A mismatched card gets one
 * more attempt later in the same session as long as the session's total slot budget
 * (`sessionSize`) hasn't already been spent on other cards.
 */
export const useStudySessionStore = defineStore('study-session', () => {
  const lastConfig = ref<StudySessionConfig | null>(null);
  const queue = ref<Card[]>([]);
  const currentChunk = ref<Card[]>([]);
  const chunkCardIndex = ref(0);
  const phase = ref<StudySessionPhase>('studying');
  const matchingQuizChunk = ref<MatchingQuizChunk | null>(null);
  const lastAction = ref<LastSwipeAction | null>(null);
  const viewMode = ref<CardViewMode>('practice');

  const totalSlots = ref(0);
  /** How many cards this session's progress header should count against — the actual queue size
   *  (which can be smaller than `totalSlots` when the deck/topic has fewer cards than the
   *  selected session-size cap), not the raw cap itself. `totalSlots` stays the uncapped budget
   *  so a mismatched card can still be requeued for another attempt up to that cap; only the
   *  displayed "X/Y" counter and progress bar need the actual-size version. */
  const totalSessionCards = ref(0);
  const slotsUsed = ref(0);
  const completedChunkCount = ref(0);
  const totalStudied = ref(0);
  const totalMatched = ref(0);
  const totalCorrectMatches = ref(0);
  const startedAt = ref(0);
  const finishedAt = ref<number | null>(null);

  const hasCards = computed(() => totalSlots.value > 0);
  const currentCard = computed(() => currentChunk.value[chunkCardIndex.value]);
  const nextCard = computed(() => currentChunk.value[chunkCardIndex.value + 1]);
  const canUndo = computed(() => lastAction.value !== null);
  const accuracy = computed(() => (totalMatched.value > 0 ? totalCorrectMatches.value / totalMatched.value : 0));
  const elapsedMs = computed(() => (finishedAt.value ?? Date.now()) - startedAt.value);

  function start(config: StudySessionConfig, initialViewMode: CardViewMode = 'practice'): void {
    const cardStore = useCardStore();
    const candidates = cardStore.cards.filter((card) => {
      if (config.deckId && card.deckId !== config.deckId) return false;
      if (config.topicId && card.topicId !== config.topicId) return false;
      return true;
    });

    const initialQueue = buildPriorityQueue(candidates, config.sessionSize);

    lastConfig.value = config;
    totalSlots.value = config.sessionSize;
    totalSessionCards.value = initialQueue.length;
    slotsUsed.value = initialQueue.length;
    queue.value = initialQueue;
    currentChunk.value = queue.value.splice(0, Math.min(5, queue.value.length));
    chunkCardIndex.value = 0;
    phase.value = 'studying';
    matchingQuizChunk.value = null;
    lastAction.value = null;
    completedChunkCount.value = 0;
    totalStudied.value = 0;
    totalMatched.value = 0;
    totalCorrectMatches.value = 0;
    startedAt.value = Date.now();
    finishedAt.value = null;
    viewMode.value = initialViewMode;
  }

  /** Re-runs the same deck/topic/size config for the Session Summary's "Study Another Batch". */
  function restart(): void {
    if (lastConfig.value) start(lastConfig.value, viewMode.value);
  }

  function advanceAfterChunk(): void {
    if (queue.value.length > 0) {
      currentChunk.value = queue.value.splice(0, Math.min(5, queue.value.length));
      chunkCardIndex.value = 0;
      lastAction.value = null;
      matchingQuizChunk.value = null;
      phase.value = 'studying';
    } else {
      phase.value = 'summary';
      finishedAt.value = Date.now();
      void dailyStatRepository.incrementToday(totalStudied.value);
    }
  }

  async function swipe(direction: SwipeDirection): Promise<void> {
    const card = currentCard.value;
    if (!card) return;

    const cardStore = useCardStore();
    const previousStatus = card.reviewStatus;
    const next = nextReviewStatus(previousStatus, direction);

    await cardStore.setReviewStatus(card.id, next);
    lastAction.value = { index: chunkCardIndex.value, cardId: card.id, previousStatus };
    chunkCardIndex.value += 1;
    totalStudied.value += 1;

    if (chunkCardIndex.value >= currentChunk.value.length) {
      matchingQuizChunk.value = buildMatchingQuizChunk(currentChunk.value);
      phase.value = 'quiz';
    }
  }

  /** Study mode's plain "Next" — moves to the next card without recording a Known/Not Known
   *  assessment (that's Practice mode's job, via `swipe`), but still counts toward the session's
   *  studied total and still hands off to the matching quiz once the chunk is done. */
  function advance(): void {
    if (!currentCard.value) return;

    lastAction.value = null;
    chunkCardIndex.value += 1;
    totalStudied.value += 1;

    if (chunkCardIndex.value >= currentChunk.value.length) {
      matchingQuizChunk.value = buildMatchingQuizChunk(currentChunk.value);
      phase.value = 'quiz';
    }
  }

  /** Study mode's plain "Previous" — steps back within the current chunk only. */
  function goToPrevious(): void {
    if (chunkCardIndex.value === 0) return;
    chunkCardIndex.value -= 1;
    totalStudied.value = Math.max(0, totalStudied.value - 1);
  }

  /** Capped at 1-card depth: only the most recent swipe can be undone. */
  async function undo(): Promise<void> {
    if (!lastAction.value) return;

    const cardStore = useCardStore();
    await cardStore.setReviewStatus(lastAction.value.cardId, lastAction.value.previousStatus);
    chunkCardIndex.value = lastAction.value.index;
    totalStudied.value = Math.max(0, totalStudied.value - 1);
    lastAction.value = null;
  }

  /** Logs each match outcome onto its card, then re-queues mismatches a few slots ahead if the
   *  session's slot budget still has room, before moving on to the next chunk (or the summary). */
  async function submitMatchingResults(results: MatchResult[]): Promise<void> {
    const cardStore = useCardStore();
    await Promise.all(results.map((result) => cardStore.recordMatchResult(result.cardId, result.correct)));

    totalMatched.value += results.length;
    totalCorrectMatches.value += results.filter((result) => result.correct).length;

    for (const result of results) {
      if (result.correct || slotsUsed.value >= totalSlots.value) continue;
      const card = currentChunk.value.find((chunkCard) => chunkCard.id === result.cardId);
      if (!card) continue;

      const insertAt = Math.min(3, queue.value.length);
      queue.value.splice(insertAt, 0, card);
      slotsUsed.value += 1;
    }

    completedChunkCount.value += 1;
    advanceAfterChunk();
  }

  return {
    lastConfig,
    queue,
    currentChunk,
    chunkCardIndex,
    phase,
    matchingQuizChunk,
    viewMode,
    totalSlots,
    totalSessionCards,
    slotsUsed,
    completedChunkCount,
    totalStudied,
    totalMatched,
    totalCorrectMatches,
    hasCards,
    currentCard,
    nextCard,
    canUndo,
    accuracy,
    elapsedMs,
    start,
    restart,
    swipe,
    advance,
    goToPrevious,
    undo,
    submitMatchingResults,
  };
});
