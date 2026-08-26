<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Collapsed-height threshold in pixels — content taller than this gets clipped with a
     *  "Show More" gradient until expanded. */
    maxHeight?: number;
    /** Tailwind `from-*`/`via-*` classes for the fade-out gradient behind "Show More" — must
     *  match the container's own background so the fade blends in instead of showing a seam. */
    fadeClass?: string;
  }>(),
  {
    maxHeight: 120,
    fadeClass: 'from-background via-background/80',
  },
);

/** Only start clipping once content clears the threshold by more than this — guards against
 *  `scrollHeight`'s integer rounding (and other sub-pixel measurement noise) flagging a card as
 *  "overflowing" by a pixel or two, which would otherwise clip descenders off its last line. */
const OVERFLOW_TOLERANCE = 20;

/** Added on top of the measured height when expanded, so a rounded/stale measurement can't clip
 *  the last line while `overflow: hidden` is still in effect for the expand/collapse animation. */
const EXPANDED_HEIGHT_BUFFER = 8;

const contentRef = ref<HTMLElement>();
/** 0 until the first ResizeObserver callback fires (shortly after mount) — `scrollHeight`
 *  already accounts for the content wrapper's own padding. */
const contentHeight = ref(0);
const isExpanded = ref(false);

useResizeObserver(contentRef, ([entry]) => {
  contentHeight.value = entry.target.scrollHeight;
});

const isOverflowing = computed(() => contentHeight.value > props.maxHeight + OVERFLOW_TOLERANCE);
/** The only state that actually clips anything — `overflow: hidden` stays scoped to whichever
 *  card is overflowing at all (collapsed or mid-expand-animation); a never-overflowing card is
 *  always `visible`, so a stale or rounded height measurement can never cut off its text. */
const currentOverflow = computed(() => (isOverflowing.value ? 'hidden' : 'visible'));

const currentMaxHeight = computed(() => {
  if (!isOverflowing.value) return 'none';
  if (!isExpanded.value) return `${props.maxHeight}px`;
  // Expanded: a concrete (buffered) px value, not 'none', so max-height can transition smoothly
  // from the collapsed threshold instead of snapping straight to full height.
  return `${contentHeight.value + EXPANDED_HEIGHT_BUFFER}px`;
});
</script>

<template>
  <div>
    <div
      class="relative transition-[max-height] duration-300 ease-in-out"
      :style="{ maxHeight: currentMaxHeight, overflow: currentOverflow }"
    >
      <div
        ref="contentRef"
        class="pb-1"
      >
        <slot />
      </div>

      <button
        v-if="isOverflowing && !isExpanded"
        type="button"
        aria-label="Show more of this card"
        class="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center gap-1 bg-linear-to-t to-transparent pb-1.5 text-xs font-medium text-text/60 hover:text-primary"
        :class="fadeClass"
        @pointerdown.stop
        @click.stop="isExpanded = true"
      >
        Show More ↓
      </button>
    </div>

    <button
      v-if="isOverflowing && isExpanded"
      type="button"
      aria-label="Show less of this card"
      class="mt-2 w-full text-center text-xs font-medium text-text/60 hover:text-primary"
      @pointerdown.stop
      @click.stop="isExpanded = false"
    >
      Show Less ↑
    </button>
  </div>
</template>
