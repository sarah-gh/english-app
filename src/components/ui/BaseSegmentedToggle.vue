<script setup lang="ts" generic="T extends string">
import { computed } from 'vue';

/** Pill fill + label-on-pill text for each supported active color — kept as literal Tailwind
 *  class strings (rather than built from the key) so Tailwind's scanner picks them up. */
const ACTIVE_COLOR_CLASSES = {
  primary: { pill: 'bg-primary', label: 'text-background', hover: 'hover:bg-primary/10' },
  secondary: { pill: 'bg-secondary', label: 'text-text', hover: 'hover:bg-secondary/10' },
  gold: { pill: 'bg-card-gold', label: 'text-[#071518]', hover: 'hover:bg-card-gold/10' },
} as const;

const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: { value: T; label: string; color?: keyof typeof ACTIVE_COLOR_CLASSES }[];
    /** sm=text-xs py-1.5 (compact toggles), md=text-sm py-2 (default). */
    size?: 'sm' | 'md';
    /** 'default' = the app-wide look (tinted surface track, brand-colored active label).
     *  'recessed' = a darker, inset "well" track with a fixed dark active label — used by the
     *  Settings view's redesign, opt-in so every other call site keeps its current look. */
    tone?: 'default' | 'recessed';
  }>(),
  {
    size: 'md',
    tone: 'default',
  },
);

defineEmits<{ 'update:modelValue': [value: T] }>();

const activeIndex = computed(() => Math.max(0, props.options.findIndex((option) => option.value === props.modelValue)));

const activeColor = computed(() => ACTIVE_COLOR_CLASSES[props.options[activeIndex.value]?.color ?? 'primary']);

const buttonSizeClasses = computed(() => (props.size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'));

const trackClasses = computed(() =>
  props.tone === 'recessed'
    ? 'rounded-xl border border-text/10 bg-black/5 dark:bg-slate-950/40 p-1'
    : 'rounded-lg border bg-card-surface border-primary/30 p-1',
);

const activeLabelClass = computed(() => (props.tone === 'recessed' ? 'text-slate-950 font-medium' : activeColor.value.label));
const inactiveLabelClass = computed(() =>
  props.tone === 'recessed' ? 'text-text/60 hover:text-text' : ['text-text', activeColor.value.hover],
);
</script>

<template>
  <div :class="trackClasses">
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
        :class="[buttonSizeClasses, modelValue === option.value ? activeLabelClass : inactiveLabelClass]"
        @click="$emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
