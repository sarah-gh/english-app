<script setup lang="ts" generic="T extends string">
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue';
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: T;
    options: { value: T; label: string }[];
    label?: string;
    /** Shown in the trigger when `modelValue` doesn't match any option. */
    placeholder?: string;
    disabled?: boolean;
  }>(),
  {
    label: undefined,
    placeholder: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{ 'update:modelValue': [value: T] }>();

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
      {{ label }}
    </label>
    <Listbox
      :model-value="modelValue"
      :disabled="disabled"
      @update:model-value="(value) => emit('update:modelValue', value as T)"
    >
      <div class="relative">
        <ListboxButton
          :id="selectId"
          class="flex w-full items-center justify-between gap-2 rounded border border-text/20 bg-background px-3 py-2 text-left text-sm text-text focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:bg-text/5 disabled:text-text/40"
        >
          <span
            class="truncate"
            :class="selectedLabel ? '' : 'text-text/40'"
          >
            {{ selectedLabel ?? placeholder ?? ' ' }}
          </span>
          <AppIcon
            icon-name="ArrowDown2"
            :size="16"
            class="shrink-0 text-text/50"
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
  </div>
</template>
