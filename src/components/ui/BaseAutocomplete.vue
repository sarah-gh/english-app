<script setup lang="ts" generic="T extends { value: string; label?: string }">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue: string;
    items: T[];
    loading?: boolean;
    id?: string;
    placeholder?: string;
    invalid?: boolean;
    /** Suggestions won't open until the field holds at least this many characters. */
    minChars?: number;
  }>(),
  {
    loading: false,
    id: undefined,
    placeholder: undefined,
    invalid: false,
    minChars: 2,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  select: [item: T];
  blur: [event: FocusEvent];
}>();

const inputRef = ref<HTMLInputElement>();
const hasFocus = ref(false);
const dismissed = ref(false);
const activeIndex = ref(-1);

const meetsMinChars = computed(() => props.modelValue.trim().length >= props.minChars);
const isOpen = computed(() => hasFocus.value && meetsMinChars.value && !dismissed.value);

watch(
  () => props.items,
  () => {
    activeIndex.value = -1;
  },
);

function handleInput(event: Event) {
  dismissed.value = false;
  emit('update:modelValue', (event.target as HTMLInputElement).value);
}

function handleFocus() {
  hasFocus.value = true;
  dismissed.value = false;
}

/** A click while the field is already focused doesn't re-fire `focus`, so Escape-dismissed
 *  suggestions would otherwise stay hidden until the user blurs and refocuses. */
function handleClick() {
  dismissed.value = false;
}

function handleBlur(event: FocusEvent) {
  hasFocus.value = false;
  emit('blur', event);
}

function selectItem(item: T) {
  dismissed.value = true;
  activeIndex.value = -1;
  emit('update:modelValue', item.value);
  emit('select', item);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    dismissed.value = true;
    activeIndex.value = -1;
    return;
  }
  if (!isOpen.value || props.items.length === 0) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    activeIndex.value = (activeIndex.value + 1) % props.items.length;
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    activeIndex.value = activeIndex.value <= 0 ? props.items.length - 1 : activeIndex.value - 1;
  } else if ((event.key === 'Enter' || event.key === 'Tab') && activeIndex.value >= 0) {
    event.preventDefault();
    selectItem(props.items[activeIndex.value]);
  }
}
</script>

<template>
  <div class="relative">
    <input
      :id="id"
      ref="inputRef"
      :value="modelValue"
      type="text"
      :placeholder="placeholder"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="isOpen"
      class="w-full rounded border px-3 py-2 text-sm focus:border-primary focus:outline-none"
      :class="invalid ? 'border-danger/80' : 'border-text/20'"
      @input="handleInput"
      @focus="handleFocus"
      @click="handleClick"
      @blur="handleBlur"
      @keydown="handleKeydown"
    />
    <ul
      v-if="isOpen"
      class="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-text/10 bg-white/95 dark:bg-slate-900/95 py-1 text-sm shadow-lg"
    >
      <li
        v-if="items.length === 0"
        class="px-3 py-2 text-xs text-text/35"
      >
        {{ loading ? 'Searching…' : 'No matches found.' }}
      </li>
      <template v-else>
        <li
          v-for="(item, index) in items"
          :key="item.value + index"
          class="cursor-pointer px-3 py-2 transition-colors duration-100"
          :class="index === activeIndex ? 'bg-primary/10' : 'hover:bg-primary/5'"
          @mousedown.prevent="selectItem(item)"
          @mouseenter="activeIndex = index"
        >
          <slot
            name="item"
            :item="item"
            :active="index === activeIndex"
          >
            {{ item.label ?? item.value }}
          </slot>
        </li>
        <li
          v-if="loading"
          class="border-t border-text/10 px-3 py-2 text-xs text-text/35"
        >
          Searching…
        </li>
      </template>
    </ul>
  </div>
</template>
