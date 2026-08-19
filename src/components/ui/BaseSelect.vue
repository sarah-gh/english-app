<script setup lang="ts">
import { useId } from 'vue';

withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    disabled?: boolean;
  }>(),
  {
    label: undefined,
    disabled: false,
  },
);

defineEmits<{ 'update:modelValue': [value: string] }>();

const selectId = useId();
</script>

<template>
  <div>
    <label
      v-if="label"
      :for="selectId"
      class="mb-1 block text-xs font-medium text-gray-600"
    >
      {{ label }}
    </label>
    <select
      :id="selectId"
      :value="modelValue"
      :disabled="disabled"
      class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-50"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <slot />
    </select>
  </div>
</template>
