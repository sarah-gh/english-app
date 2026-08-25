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
    /** Iconsax icon name shown as a leading glyph inside the field (e.g. "SearchNormal1"). */
    icon?: string;
  }>(),
  {
    label: undefined,
    type: 'text',
    placeholder: undefined,
    error: undefined,
    disabled: false,
    required: false,
    rows: undefined,
    icon: undefined,
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
      class="mb-1 block text-xs font-medium text-text/60"
    >
      {{ label }}<span
        v-if="required"
        class="text-danger"
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
      class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-text/5"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <div
      v-else
      class="relative"
    >
      <AppIcon
        v-if="icon"
        :icon-name="icon"
        :size="16"
        class="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-text/40"
      />
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="w-full rounded border border-text/20 py-2 text-sm focus:border-primary focus:outline-none disabled:bg-text/5"
        :class="icon ? 'pl-8 pr-3' : 'px-3'"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p
      v-if="error"
      class="mt-1 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ error }}
    </p>
  </div>
</template>
