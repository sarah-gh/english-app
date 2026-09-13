<script setup lang="ts">
import { useVirtualizer } from '@tanstack/vue-virtual';
import { computed, shallowRef } from 'vue';
import CardListItem from '@/components/card-management/CardListItem.vue';
import type { Card } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';

const props = defineProps<{
  cards: Card[];
  viewMode: CardViewMode;
}>();

/** Cards render at wildly different heights (tags, examples, revealed answers…), so only the
 *  first paint of each row leans on this estimate — `measureElement` below immediately corrects
 *  it against the real DOM height and keeps re-measuring via its own ResizeObserver as content
 *  (e.g. "Show More"/"Show Answer") expands or collapses in place. */
const ESTIMATED_ROW_HEIGHT = 140;
const ROW_GAP = 12;

const scrollParentRef = shallowRef<HTMLDivElement | null>(null);

const virtualizer = useVirtualizer<HTMLDivElement, HTMLElement>(
  computed(() => ({
    count: props.cards.length,
    getScrollElement: () => scrollParentRef.value,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 6,
    gap: ROW_GAP,
    getItemKey: (index: number) => props.cards[index]!.id,
  })),
);

const virtualItems = computed(() => virtualizer.value.getVirtualItems());
const totalSize = computed(() => virtualizer.value.getTotalSize());

function measureRef(el: Element | null) {
  if (el instanceof HTMLElement) virtualizer.value.measureElement(el);
}
</script>

<template>
  <div
    ref="scrollParentRef"
    class="max-h-130 overflow-y-auto px-1"
  >
    <div :style="{ height: `${totalSize}px`, position: 'relative', width: '100%' }">
      <div
        v-for="virtualRow in virtualItems"
        :key="virtualRow.key"
        :ref="measureRef"
        :data-index="virtualRow.index"
        :style="{
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          transform: `translateY(${virtualRow.start}px)`,
        }"
      >
        <CardListItem
          :card="cards[virtualRow.index]!"
          :view-mode="viewMode"
        />
      </div>
    </div>
  </div>
</template>
