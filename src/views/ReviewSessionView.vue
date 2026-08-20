<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ReviewCard from '@/components/review/ReviewCard.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import type { SwipeDirection } from '@/services/review/state-machine';
import { useReviewSessionStore } from '@/stores/review-session-store';

const router = useRouter();
const reviewSessionStore = useReviewSessionStore();

const activeCardRef = ref<InstanceType<typeof ReviewCard>>();

const hadCards = computed(() => reviewSessionStore.queue.length > 0);
const progressLabel = computed(() => {
  const position = Math.min(reviewSessionStore.currentIndex + 1, reviewSessionStore.queue.length);
  return `${position} / ${reviewSessionStore.queue.length}`;
});

function handleSwipe(direction: SwipeDirection) {
  reviewSessionStore.swipe(direction);
}

function triggerButtonSwipe(direction: SwipeDirection) {
  activeCardRef.value?.triggerSwipe(direction);
}

function handleUndo() {
  reviewSessionStore.undo();
}

function backToSetup() {
  router.push('/review');
}
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white px-4 py-6">
    <div class="mb-4 flex items-center justify-between">
      <button
        type="button"
        class="text-sm text-gray-500 hover:text-black"
        @click="backToSetup"
      >
        ← Exit
      </button>
      <span
        v-if="hadCards"
        class="text-sm text-gray-500"
        >{{ progressLabel }}</span
      >
      <button
        type="button"
        :disabled="!reviewSessionStore.canUndo"
        class="text-sm font-medium text-black underline underline-offset-2 disabled:text-gray-300 disabled:no-underline"
        @click="handleUndo"
      >
        Undo
      </button>
    </div>

    <div
      v-if="!hadCards"
      class="flex flex-1 flex-col items-center justify-center gap-4 text-center"
    >
      <p class="text-base font-medium text-black">Nothing to review here.</p>
      <p class="text-sm text-gray-500">Try a different deck, tier, or add more cards.</p>
      <button
        type="button"
        class="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        @click="backToSetup"
      >
        Back to Review Setup
      </button>
    </div>

    <div
      v-else-if="reviewSessionStore.isComplete"
      class="flex flex-1 flex-col items-center justify-center gap-4 text-center"
    >
      <p class="text-base font-medium text-black">Session complete!</p>
      <p class="text-sm text-gray-500">
        You reviewed {{ reviewSessionStore.queue.length }} card{{
          reviewSessionStore.queue.length === 1 ? '' : 's'
        }}.
      </p>
      <button
        type="button"
        class="rounded bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        @click="backToSetup"
      >
        Back to Review Setup
      </button>
    </div>

    <template v-else>
      <BaseSegmentedToggle
        v-model="reviewSessionStore.viewMode"
        class="mx-auto mb-4 w-full max-w-sm"
        size="sm"
        :options="[
          { value: 'study', label: 'Study' },
          { value: 'practice', label: 'Practice' },
        ]"
      />

      <div class="relative mx-auto w-full max-w-sm flex-1">
        <div
          v-if="reviewSessionStore.nextCard"
          inert
          class="absolute inset-0 scale-95 opacity-50"
        >
          <ReviewCard
            :card="reviewSessionStore.nextCard"
            :interactive="false"
            :view-mode="reviewSessionStore.viewMode"
          />
        </div>
        <div
          v-if="reviewSessionStore.currentCard"
          class="absolute inset-0"
        >
          <ReviewCard
            :key="reviewSessionStore.currentCard.id"
            ref="activeCardRef"
            :card="reviewSessionStore.currentCard"
            interactive
            :view-mode="reviewSessionStore.viewMode"
            @swipe="handleSwipe"
          />
        </div>
      </div>

      <div class="mx-auto mt-6 flex w-full max-w-sm gap-4">
        <button
          type="button"
          class="flex-1 rounded-full border-2 border-black py-3 text-sm font-semibold text-black hover:bg-black hover:text-white"
          @click="triggerButtonSwipe('left')"
        >
          ✕ Not Known
        </button>
        <button
          type="button"
          class="flex-1 rounded-full border-2 border-black py-3 text-sm font-semibold text-black hover:bg-black hover:text-white"
          @click="triggerButtonSwipe('right')"
        >
          ✓ Known
        </button>
      </div>
    </template>
  </div>
</template>
