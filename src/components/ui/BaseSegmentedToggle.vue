<script setup lang="ts" generic="T extends string">
import { computed } from 'vue';

/** Pill fill + label-on-pill text for each supported active color — kept as literal Tailwind
 *  class strings (rather than built from the key) so Tailwind's scanner picks them up. */
const ACTIVE_COLOR_CLASSES = {
  primary: { pill: 'bg-primary', label: 'text-background' },
  secondary: { pill: 'bg-secondary', label: 'text-text' },
} as const;

const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: { value: T; label: string; color?: keyof typeof ACTIVE_COLOR_CLASSES }[];
    /** sm=text-xs py-1.5 (compact toggles), md=text-sm py-2 (default). */
    size?: 'sm' | 'md';
  }>(),
  {
    size: 'md',
  },
);

defineEmits<{ 'update:modelValue': [value: T] }>();

const activeIndex = computed(() => Math.max(0, props.options.findIndex((option) => option.value === props.modelValue)));

const activeColor = computed(() => ACTIVE_COLOR_CLASSES[props.options[activeIndex.value]?.color ?? 'primary']);

const buttonSizeClasses = computed(() => (props.size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'));
</script>

<template>
  <div class="rounded-lg border border-primary/30 p-1">
    <div class="relative flex">
      <div
        class="absolute inset-y-0 rounded transition-[transform,background-color] duration-200 ease-in-out"
        :class="activeColor.pill"
        :style="{
          width: `${100 / options.length}%`,
          transform: `translateX(${activeIndex * 100}%)`,
        }"
      />
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="relative z-10 flex-1 rounded font-medium transition-colors duration-150"
        :class="[buttonSizeClasses, modelValue === option.value ? activeColor.label : 'text-text hover:bg-primary/10']"
        @click="$emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
