<script setup lang="ts">
import BaseInput from '@/components/ui/BaseInput.vue';
import type { WordFamilyFormState } from './card-form-state';

defineProps<{
  /** For the "Word Form" placeholders, e.g. "Success" for a "Successful" adjective placeholder. */
  rootWord: string;
}>();

const data = defineModel<WordFamilyFormState>('data', { required: true });

const SECTIONS: { key: keyof Omit<WordFamilyFormState, 'usageNotes'>; label: string }[] = [
  { key: 'noun', label: 'Noun' },
  { key: 'verb', label: 'Verb' },
  { key: 'adjective', label: 'Adjective' },
  { key: 'adverb', label: 'Adverb' },
];
</script>

<template>
  <div>
    <p class="mb-2 text-xs font-medium text-gray-600">Word Family Forms</p>
    <div class="space-y-3">
      <div
        v-for="section in SECTIONS"
        :key="section.key"
        class="space-y-2 rounded border border-gray-200 p-3"
      >
        <div class="flex items-center gap-2">
          <span class="rounded bg-black px-1.5 py-0.5 text-[10px] font-bold text-white uppercase">
            {{ section.label }}
          </span>
        </div>
        <BaseInput
          v-model="data[section.key].word"
          label="Word Form"
          :placeholder="rootWord ? `e.g. ${rootWord}...` : 'e.g. Successful'"
        />
        <BaseInput
          v-model="data[section.key].meaning"
          label="Persian Meaning"
          placeholder="معنی فارسی"
        />
        <BaseInput
          v-model="data[section.key].example"
          label="Example Sentence"
          placeholder="A natural sentence using this form"
        />
      </div>
    </div>

    <div class="mt-3">
      <label
        for="word-family-usage-notes"
        class="mb-1 block text-xs font-medium text-gray-600"
        >Usage Notes (optional)</label
      >
      <textarea
        id="word-family-usage-notes"
        v-model="data.usageNotes"
        rows="2"
        placeholder="Any nuance in how these forms are used differently"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
      />
    </div>
  </div>
</template>
