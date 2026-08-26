<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ReviewCard from '@/components/review/ReviewCard.vue';
import MatchingQuiz from '@/components/study/MatchingQuiz.vue';
import SessionSummaryReport from '@/components/study/SessionSummaryReport.vue';
import StudyChunkProgress from '@/components/study/StudyChunkProgress.vue';
import type { SwipeDirection } from '@/services/review/state-machine';
import { useStudySessionStore, type MatchResult } from '@/stores/study-session-store';
import { useThemeStore } from '@/stores/theme-store';

const router = useRouter();
const studySessionStore = useStudySessionStore();
const themeStore = useThemeStore();

const activeCardRef = ref<InstanceType<typeof ReviewCard>>();

/** Dark theme gets the tiled leaf-pattern photo (blended so it only shows as a faint texture);
 *  light theme just uses the plain `bg-page-editorial` surface color already on the page. */
const backgroundImageStyle = computed(() =>
  themeStore.isDark
    ? {
        backgroundImage: `url(${import.meta.env.BASE_URL}Picture1.jpg)`,
        backgroundSize: '150px',
        backgroundBlendMode: 'color-dodge',
      }
    : {},
);

const chunkNumber = computed(() => studySessionStore.completedChunkCount + 1);

function handleSwipe(direction: SwipeDirection) {
  studySessionStore.swipe(direction);
}

function triggerButtonSwipe(direction: SwipeDirection) {
  activeCardRef.value?.triggerSwipe(direction);
}

function handleUndo() {
  studySessionStore.undo();
}

function handleNext() {
  studySessionStore.advance();
}

function handlePrevious() {
  studySessionStore.goToPrevious();
}

function handleMatchingComplete(results: MatchResult[]) {
  studySessionStore.submitMatchingResults(results);
}

function backToSetup() {
  router.push('/study');
}

/** Prefers the exact topic/deck the session was scoped to; falls back up the Browse hierarchy
 *  when the session covered "All decks" or "All topics". */
function backToTopic() {
  const config = studySessionStore.lastConfig;
  if (config?.deckId && config.topicId) {
    router.push(`/cards/${config.deckId}/${config.topicId}`);
  } else if (config?.deckId) {
    router.push(`/cards/${config.deckId}`);
  } else {
    router.push('/cards');
  }
}

function studyAnotherBatch() {
  studySessionStore.restart();
}
</script>

<template>
  <div
    class="flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-card-definition bg-repeat px-4 py-6"
    :style="backgroundImageStyle"
  >
    <div class="mb-4 flex items-center justify-between">
      <button
        type="button"
        class="inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
        @click="backToSetup"
      >
        <AppIcon
          icon-name="ArrowLeft"
          :size="14"
        />
        Exit
      </button>
      <button
        v-if="studySessionStore.phase === 'studying' && studySessionStore.viewMode === 'practice'"
        type="button"
        :disabled="!studySessionStore.canUndo"
        class="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-2 disabled:text-text/25 disabled:no-underline"
        @click="handleUndo"
      >
        <AppIcon
          icon-name="Refresh"
          :size="14"
        />
        Undo
      </button>
    </div>

    <div
      v-if="!studySessionStore.hasCards"
      class="flex flex-1 flex-col items-center justify-center gap-4 text-center"
    >
      <p class="text-base font-medium text-text">Nothing to study here.</p>
      <p class="text-sm text-text/50">Try a different deck, topic, or add more cards.</p>
      <button
        type="button"
        class="rounded bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary/90"
        @click="backToSetup"
      >
        Back to Study Setup
      </button>
    </div>

    <SessionSummaryReport
      v-else-if="studySessionStore.phase === 'summary'"
      :total-studied="studySessionStore.totalStudied"
      :accuracy="studySessionStore.accuracy"
      :elapsed-ms="studySessionStore.elapsedMs"
      @back-to-topic="backToTopic"
      @study-another="studyAnotherBatch"
    />

    <div
      v-else-if="studySessionStore.phase === 'quiz' && studySessionStore.matchingQuizChunk"
      class="flex flex-1 flex-col justify-center"
    >
      <MatchingQuiz
        :chunk="studySessionStore.matchingQuizChunk"
        @complete="handleMatchingComplete"
      />
    </div>

    <template v-else>
      <StudyChunkProgress
        :chunk-number="chunkNumber"
        :card-index-in-chunk="studySessionStore.chunkCardIndex"
        :chunk-size="studySessionStore.currentChunk.length"
        :total-studied="studySessionStore.totalStudied"
        :total-slots="studySessionStore.totalSessionCards"
      />

      <div class="relative mx-auto w-full max-w-sm flex-1">
        <div
          v-if="studySessionStore.nextCard"
          inert
          class="absolute inset-0 scale-95 opacity-50"
        >
          <ReviewCard
            :card="studySessionStore.nextCard"
            :interactive="false"
            :view-mode="studySessionStore.viewMode"
          />
        </div>
        <div
          v-if="studySessionStore.currentCard"
          class="absolute inset-0"
        >
          <ReviewCard
            :key="studySessionStore.currentCard.id"
            ref="activeCardRef"
            :card="studySessionStore.currentCard"
            interactive
            :swipe-enabled="studySessionStore.viewMode === 'practice'"
            :view-mode="studySessionStore.viewMode"
            @swipe="handleSwipe"
          />
        </div>
      </div>

      <div
        v-if="studySessionStore.viewMode === 'practice'"
        class="mx-auto mt-6 flex w-full max-w-sm gap-4"
      >
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-danger py-3 text-sm font-semibold text-danger hover:bg-danger hover:text-background"
          @click="triggerButtonSwipe('left')"
        >
          <AppIcon
            icon-name="CloseCircle"
            :size="16"
          />
          Not Known
        </button>
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-primary py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-background"
          @click="triggerButtonSwipe('right')"
        >
          <AppIcon
            icon-name="TickCircle"
            :size="16"
          />
          Known
        </button>
      </div>

      <div
        v-else
        class="mx-auto mt-6 flex w-full max-w-sm gap-4"
      >
        <button
          type="button"
          :disabled="studySessionStore.chunkCardIndex === 0"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-text/20 py-3 text-sm font-semibold text-text/70 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:border-text/10 disabled:text-text/25"
          @click="handlePrevious"
        >
          <AppIcon
            icon-name="ArrowLeft"
            :size="16"
          />
          Previous
        </button>
        <button
          type="button"
          class="flex flex-1 items-center justify-center gap-1.5 rounded-full border-2 border-primary py-3 text-sm font-semibold text-primary hover:bg-primary hover:text-background"
          @click="handleNext"
        >
          Next
          <AppIcon
            icon-name="ArrowRight2"
            :size="16"
          />
        </button>
      </div>
    </template>
  </div>
</template>
