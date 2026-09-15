<script setup lang="ts">
import { useWindowScroll } from '@vueuse/core';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

/**
 * Standard back-navigation control for a page header. Sits inline at the top of the page like a
 * plain text link; once the user scrolls past `threshold`, it turns into a floating glass pill
 * pinned to the top of the viewport so the way back stays reachable without permanently eating
 * header space. Stays `position: sticky` the whole time (not `fixed`) so it never needs a layout
 * placeholder to avoid a content jump — only the glass/pill *styling* is threshold-gated.
 */
const props = withDefaults(
  defineProps<{
    /** Route path to link to. Omit to instead emit `click` (e.g. a guarded/confirm-before-exit flow). */
    to?: string;
    label: string;
    threshold?: number;
  }>(),
  { to: undefined, threshold: 120 },
);

const emit = defineEmits<{ click: [] }>();

const { y } = useWindowScroll();
const isStuck = computed(() => y.value > props.threshold);

function handleClick() {
  if (!props.to) emit('click');
}
</script>

<template>
  <component
    :is="to ? RouterLink : 'button'"
    :to="to"
    :type="to ? undefined : 'button'"
    class="sticky top-3 z-40 mb-4 inline-flex w-fit items-center gap-1 rounded-full text-sm text-text/50 transition-all duration-300 ease-out hover:text-primary"
    :class="
      isStuck
        ? 'scale-[1.02] bg-background/80 px-3 py-1.5 shadow-md ring-1 ring-text/10 backdrop-blur-md'
        : 'scale-100 px-0 py-0'
    "
    @click="handleClick"
  >
    <AppIcon
      icon-name="ArrowLeft"
      :size="14"
    />
    {{ label }}
  </component>
</template>
