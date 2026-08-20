<script setup lang="ts" generic="T extends string">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: { value: T; label: string }[];
    /** sm=text-xs py-1.5 (compact toggles), md=text-sm py-2 (default). */
    size?: 'sm' | 'md';
  }>(),
  {
    size: 'md',
  },
);

defineEmits<{ 'update:modelValue': [value: T] }>();

const activeIndex = computed(() => Math.max(0, props.options.findIndex((option) => option.value === props.modelValue)));

const buttonSizeClasses = computed(() => (props.size === 'sm' ? 'py-1.5 text-xs' : 'py-2 text-sm'));
</script>

<template>
  <div class="rounded-lg border border-black p-1">
    <div class="relative flex">
      <div
        class="absolute inset-y-0 rounded bg-black transition-transform duration-200 ease-in-out"
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
        :class="[buttonSizeClasses, modelValue === option.value ? 'text-white' : 'text-black hover:bg-gray-100']"
        @click="$emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>
