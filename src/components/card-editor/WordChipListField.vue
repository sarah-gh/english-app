<script setup lang="ts">
import { ref } from 'vue';

withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
  }>(),
  { placeholder: 'Type a word and press Enter' },
);

const words = defineModel<string[]>('words', { required: true });

const draft = ref('');

function addWord() {
  const word = draft.value.trim();
  if (!word || words.value.includes(word)) {
    draft.value = '';
    return;
  }
  words.value = [...words.value, word];
  draft.value = '';
}

function removeWord(index: number) {
  words.value = words.value.filter((_, i) => i !== index);
}
</script>

<template>
  <div>
    <label class="mb-1 block text-xs font-medium text-text/60">{{ label }}</label>
    <div class="flex flex-wrap items-center gap-1.5 rounded border border-text/20 p-2 focus-within:border-primary">
      <span
        v-for="(word, index) in words"
        :key="word"
        class="inline-flex items-center gap-1 rounded-full border border-text/15 bg-text/5 px-2.5 py-1 text-xs font-medium text-text/70"
      >
        {{ word }}
        <button
          type="button"
          :aria-label="`Remove ${word}`"
          class="text-text/40 hover:text-danger"
          @click="removeWord(index)"
        >
          <AppIcon
            icon-name="CloseCircle"
            :size="13"
          />
        </button>
      </span>
      <input
        v-model="draft"
        type="text"
        :placeholder="words.length === 0 ? placeholder : ''"
        class="min-w-[8rem] flex-1 border-none py-1 text-sm outline-none"
        @keydown.enter.prevent="addWord"
        @blur="addWord"
      />
    </div>
  </div>
</template>
