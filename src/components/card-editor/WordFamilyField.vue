<script setup lang="ts">
import { computed } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { useAutofillWordFamily } from '@/queries/use-autofill-word-family';
import { hasRequiredAiCredentials } from '@/services/ai/ai-card-autofill-service';
import { AiServiceError } from '@/services/ai/errors';
import { useSettingsStore } from '@/stores/settings-store';
import AiFieldButton from './AiFieldButton.vue';
import type { WordFamilyFormState } from './card-form-state';

const props = defineProps<{
  /** For the "Word Form" placeholders, e.g. "Success" for a "Successful" adjective placeholder. */
  rootWord: string;
  error?: string;
}>();

const data = defineModel<WordFamilyFormState>('data', { required: true });

const settingsStore = useSettingsStore();
const { mutateAsync: requestWordFamily, isPending: isGenerating, error: generateApiError } = useAutofillWordFamily();

const canGenerate = computed(() => hasRequiredAiCredentials(settingsStore.settings) && props.rootWord.trim().length > 0);
const generateErrorMessage = computed(() => {
  const apiError = generateApiError.value;
  if (!apiError) return '';
  return apiError instanceof AiServiceError ? apiError.message : 'Auto-fill failed. Please try again.';
});

async function handleGenerate() {
  const rootWord = props.rootWord.trim();
  if (!rootWord) return;
  try {
    const result = await requestWordFamily({ settings: settingsStore.settings, rootWord });
    const toFormState = (detail?: { word: string; meaning?: string; example?: string }) => ({
      word: detail?.word ?? '',
      meaning: detail?.meaning ?? '',
      example: detail?.example ?? '',
    });
    data.value = {
      noun: toFormState(result.noun),
      verb: toFormState(result.verb),
      adjective: toFormState(result.adjective),
      adverb: toFormState(result.adverb),
      usageNotes: result.usageNotes ?? data.value.usageNotes,
    };
  } catch {
    // generateErrorMessage (computed above) already reflects the mutation's error state.
  }
}

const SECTIONS: { key: keyof Omit<WordFamilyFormState, 'usageNotes'>; label: string }[] = [
  { key: 'noun', label: 'Noun' },
  { key: 'verb', label: 'Verb' },
  { key: 'adjective', label: 'Adjective' },
  { key: 'adverb', label: 'Adverb' },
];
</script>

<template>
  <div>
    <div class="mb-2 flex items-center justify-between gap-2">
      <span class="flex items-center gap-1 text-xs font-medium text-text/60">
        Word Family Forms
        <AiFieldButton
          :loading="isGenerating"
          :disabled="!canGenerate"
          :title="rootWord.trim() ? 'Auto-fill this field with AI' : 'Enter a word first to use AI Auto-Fill'"
          @click="handleGenerate"
        />
      </span>
    </div>
    <p
      v-if="generateErrorMessage"
      class="mb-2 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ generateErrorMessage }}
    </p>
    <div
      class="space-y-3 rounded"
      :class="error ? 'border border-danger/80 p-2' : ''"
    >
      <div
        v-for="section in SECTIONS"
        :key="section.key"
        class="space-y-2 rounded border bg-card-surface border-text/10 p-3"
      >
        <div class="flex items-center gap-2">
          <span class="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-text uppercase">
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
    <p
      v-if="error"
      class="mt-1 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ error }}
    </p>

    <div class="mt-3">
      <label
        for="word-family-usage-notes"
        class="mb-1 block text-xs font-medium text-text/60"
        >Usage Notes (optional)</label
      >
      <textarea
        id="word-family-usage-notes"
        v-model="data.usageNotes"
        rows="2"
        placeholder="Any nuance in how these forms are used differently"
        class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </div>
  </div>
</template>
