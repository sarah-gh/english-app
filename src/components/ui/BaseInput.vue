<script setup lang="ts">
import { useId } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';

withDefaults(
  defineProps<{
    modelValue: string;
    label?: string;
    type?: string;
    placeholder?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    /** Renders a <textarea> with this many rows instead of a single-line <input>. */
    rows?: number;
  }>(),
  {
    label: undefined,
    type: 'text',
    placeholder: undefined,
    error: undefined,
    disabled: false,
    required: false,
    rows: undefined,
  },
);

defineEmits<{ 'update:modelValue': [value: string] }>();

const inputId = useId();
</script>

<template>
  <div>
    <label
      v-if="label"
      :for="inputId"
      class="mb-1 block text-xs font-medium text-gray-600"
    >
      {{ label }}<span
        v-if="required"
        class="text-gray-400"
      >
        *</span
      >
    </label>
    <textarea
      v-if="rows"
      :id="inputId"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      :rows="rows"
      class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-50"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <input
      v-else
      :id="inputId"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none disabled:bg-gray-50"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <p
      v-if="error"
      class="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-800"
    >
      <WarningIcon />
      {{ error }}
    </p>
  </div>
</template>
