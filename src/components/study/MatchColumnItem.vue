<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  text: string;
  /** 'hint' briefly marks the correct meaning when the user asks for a hint — clickable like
   *  'pending'/'selected', just visually nudged, and never implies the pair is actually matched. */
  status: 'pending' | 'selected' | 'correct' | 'incorrect' | 'matched' | 'hint';
}>();

defineEmits<{ click: [] }>();

const isClickable = computed(() => props.status === 'pending' || props.status === 'selected' || props.status === 'hint');
const isFilled = computed(() => props.status === 'correct' || props.status === 'matched');

const statusClasses = computed(() => {
  switch (props.status) {
    case 'selected':
      return 'border-2 border-primary shadow-[0_0_12px_rgba(53,181,190,0.35)]';
    case 'correct':
    case 'matched':
      return 'border-2 border-primary shadow-[0_0_12px_rgba(53,181,190,0.3)]';
    case 'incorrect':
      return 'border-2 border-danger text-danger animate-[shake_0.4s_ease-in-out]';
    case 'hint':
      return 'border-2 border-dashed border-primary/70 animate-pulse';
    default:
      return 'border border-white/10 hover:border-primary/50';
  }
});
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-3 rounded-xl bg-card-definition px-4 py-3.5 text-left text-sm text-text transition-colors duration-150"
    :class="[statusClasses, isClickable ? 'cursor-pointer' : 'cursor-default']"
    :disabled="!isClickable"
    @click="$emit('click')"
  >
    <span class="min-w-0 flex-1 leading-snug">{{ text }}</span>
    <span
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
      :class="isFilled ? 'border-primary bg-primary' : 'border-slate-600'"
    >
      <svg v-if="isFilled" viewBox="0 0 24 24" fill="none" class="h-3.5 w-3.5" aria-hidden="true">
        <path d="M5 13l4 4L19 7" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </span>
  </button>
</template>

<style scoped>
@keyframes shake {
  10%,
  90% {
    transform: translateX(-1px);
  }
  20%,
  80% {
    transform: translateX(2px);
  }
  30%,
  50%,
  70% {
    transform: translateX(-4px);
  }
  40%,
  60% {
    transform: translateX(4px);
  }
}
</style>
