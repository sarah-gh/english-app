<script setup lang="ts">
import { computed } from 'vue';
import type { SessionSize } from '@/stores/study-session-store';

const props = defineProps<{ modelValue: SessionSize }>();
const emit = defineEmits<{ 'update:modelValue': [value: SessionSize] }>();

const SIZE_OPTIONS: SessionSize[] = [5, 10, 15, 20];

const activeIndex = computed(() => Math.max(0, SIZE_OPTIONS.indexOf(props.modelValue)));
</script>

<template>
  <div class="rounded-lg border border-card-gold/20 bg-card-definition p-1">
    <div class="relative flex">
      <div
        class="absolute inset-y-0 rounded-md border border-card-gold/50 bg-card-surface transition-transform duration-200 ease-in-out"
        :style="{
          width: `${100 / SIZE_OPTIONS.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }"
      >
        <span class="pointer-events-none absolute top-0.5 left-0.5 h-2 w-2 rounded-tl border-t border-l border-card-gold/70" />
        <span class="pointer-events-none absolute top-0.5 right-0.5 h-2 w-2 rounded-tr border-t border-r border-card-gold/70" />
        <span class="pointer-events-none absolute bottom-0.5 left-0.5 h-2 w-2 rounded-bl border-b border-l border-card-gold/70" />
        <span class="pointer-events-none absolute right-0.5 bottom-0.5 h-2 w-2 rounded-br border-r border-b border-card-gold/70" />
      </div>

      <button
        v-for="size in SIZE_OPTIONS"
        :key="size"
        type="button"
        class="relative z-10 flex-1 rounded-md py-2 text-sm font-medium transition-colors duration-200"
        :class="props.modelValue === size ? 'text-text' : 'text-card-muted hover:text-text'"
        @click="emit('update:modelValue', size)"
      >
        {{ size }}
      </button>
    </div>
  </div>
</template>
