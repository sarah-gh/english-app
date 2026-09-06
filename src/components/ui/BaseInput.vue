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
    /** Overrides the field's border/background classes (default: `border-text/20`, transparent
     *  background), e.g. a darker "recessed" look for the Settings view's redesign. */
    inputClass?: string;
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
    inputClass: undefined,
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
      class="text-text/60 mb-1 block text-xs font-medium"
    >
      {{ label
      }}<span
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
      class="focus:border-primary disabled:bg-text/5 w-full rounded px-3 py-2 text-sm focus:outline-none"
      :class="inputClass ?? 'border-text/20 border'"
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
        class="text-text/40 pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2"
      />
      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :required="required"
        class="focus:border-primary disabled:bg-text/5 w-full rounded py-2 text-sm focus:outline-none"
        :class="[icon ? 'pr-3 pl-8' : 'px-3', inputClass ?? 'border-text/20 border']"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p
      v-if="error"
      class="text-danger mt-1 flex items-center gap-1.5 text-xs font-medium"
    >
      <WarningIcon />
      {{ error }}
    </p>
  </div>
</template>
