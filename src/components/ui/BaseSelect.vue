<script setup lang="ts" generic="T extends string">
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { computed, useId } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';

const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: { value: T; label: string }[];
    label?: string;
    /** Shown in the trigger when `modelValue` doesn't match any option. */
    placeholder?: string;
    disabled?: boolean;
    error?: string;
    required?: boolean;
    /** Overrides the trigger's background/border classes (default: `bg-background border-text/20`). */
    triggerClass?: string;
    /** Overrides the chevron icon's color class (default: `text-text/50`). */
    chevronClass?: string;
  }>(),
  {
    label: undefined,
    placeholder: undefined,
    disabled: false,
    error: undefined,
    required: false,
    triggerClass: undefined,
    chevronClass: undefined,
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: T]; blur: [] }>();

const selectId = useId();

const selectedLabel = computed(() => props.options.find((option) => option.value === props.modelValue)?.label);
</script>

<template>
  <div>
    <label
      v-if="label"
      :for="selectId"
      class="mb-1 block text-xs font-medium text-text/60"
    >
      {{ label }}<span
        v-if="required"
        class="text-danger"
      >
        *</span
      >
    </label>
    <Listbox
      :model-value="modelValue"
      :disabled="disabled"
      @update:model-value="(value) => emit('update:modelValue', value as T)"
    >
      <div class="relative">
        <ListboxButton
          :id="selectId"
          class="flex w-full bg-card-surface items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-text/5 disabled:text-text/40"
          :class="error ? 'border-danger/80 bg-background' : (triggerClass ?? 'border-text/20 bg-background')"
          @blur="emit('blur')"
        >
          <span
            class="truncate"
            :class="selectedLabel ? '' : 'text-text/40'"
          >
            {{ selectedLabel ?? placeholder ?? ' ' }}
          </span>
          <AppIcon
            icon-name="ArrowDown2"
            :size="16"
            class="shrink-0"
            :class="chevronClass ?? 'text-text/50'"
          />
        </ListboxButton>

        <transition
          leave-active-class="transition duration-100 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <ListboxOptions
            class="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-text/10 bg-white/95 py-1 text-sm shadow-lg focus:outline-none dark:bg-slate-900/95"
          >
            <ListboxOption
              v-for="option in options"
              :key="option.value"
              v-slot="{ active, selected }"
              :value="option.value"
              as="template"
            >
              <li
                class="cursor-pointer px-3 py-2 transition-colors duration-100"
                :class="[active ? 'bg-primary/10' : '', selected ? 'font-medium text-primary' : 'text-text']"
              >
                {{ option.label }}
              </li>
            </ListboxOption>
          </ListboxOptions>
        </transition>
      </div>
    </Listbox>
    <p
      v-if="error"
      class="mt-1 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ error }}
    </p>
  </div>
</template>
