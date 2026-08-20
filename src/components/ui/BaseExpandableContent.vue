<script setup lang="ts">
import { useResizeObserver } from '@vueuse/core';
import { computed, ref } from 'vue';

const props = withDefaults(
  defineProps<{
    /** Collapsed-height threshold in pixels — content taller than this gets clipped with a
     *  "Show More" gradient until expanded. */
    maxHeight?: number;
  }>(),
  {
    maxHeight: 120,
  },
);

const contentRef = ref<HTMLElement>();
/** 0 until the first ResizeObserver callback fires (shortly after mount). */
const contentHeight = ref(0);
const isExpanded = ref(false);

useResizeObserver(contentRef, ([entry]) => {
  contentHeight.value = entry.target.scrollHeight;
});

const isOverflowing = computed(() => contentHeight.value > props.maxHeight);

const currentMaxHeight = computed(() => {
  // Not measured yet — render unclipped for one frame rather than flash a 0-height box.
  if (contentHeight.value === 0) return 'none';
  if (!isOverflowing.value || isExpanded.value) return `${contentHeight.value}px`;
  return `${props.maxHeight}px`;
});
</script>

<template>
  <div>
    <div
      class="relative overflow-hidden transition-[max-height] duration-300 ease-in-out"
      :style="{ maxHeight: currentMaxHeight, overflow: isExpanded ? 'auto' : 'hidden' }"
    >
      <div ref="contentRef">
        <slot />
      </div>

      <button
        v-if="isOverflowing && !isExpanded"
        type="button"
        aria-label="Show more of this card"
        class="absolute inset-x-0 bottom-0 flex h-16 items-end justify-center gap-1 bg-linear-to-t from-white via-white/80 to-transparent pb-1.5 text-xs font-medium text-gray-600 hover:text-black"
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
      class="mt-2 w-full text-center text-xs font-medium text-gray-600 hover:text-black"
      @pointerdown.stop
      @click.stop="isExpanded = false"
    >
      Show Less ↑
    </button>
  </div>
</template>
