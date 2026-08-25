<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    color: string;
    /** Renders as a clickable toggle chip (e.g. tag filters) instead of a static display badge. */
    selectable?: boolean;
    selected?: boolean;
  }>(),
  {
    selectable: false,
    selected: false,
  },
);

defineEmits<{ click: [] }>();

/** A soft ~10% tint of the tag's own color, so unselected chips carry a hint of color while
 *  borders and text stay crisp, neutral, and legible. Selected chips go solid black instead. */
const tintStyle = computed(() => (props.selected ? {} : { backgroundColor: `${props.color}1a` }));
</script>

<template>
  <component
    :is="selectable ? 'button' : 'span'"
    :type="selectable ? 'button' : undefined"
    class="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-150"
    :class="[
      selected ? 'border-primary bg-primary text-background' : 'border-text/15 text-text/70',
      selectable && !selected ? 'cursor-pointer hover:border-primary' : '',
    ]"
    :style="tintStyle"
    @click="selectable && $emit('click')"
  >
    <span
      class="h-2 w-2 shrink-0 rounded-full"
      :style="{ backgroundColor: color }"
    />
    {{ label }}
  </component>
</template>
