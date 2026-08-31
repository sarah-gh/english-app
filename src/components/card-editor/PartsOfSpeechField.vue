<script setup lang="ts">
import { computed } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useGeneratePartsOfSpeech } from '@/queries/use-generate-parts-of-speech';
import { hasRequiredAiCredentials } from '@/services/ai/ai-card-autofill-service';
import { AiServiceError } from '@/services/ai/errors';
import { useSettingsStore } from '@/stores/settings-store';
import AiFieldButton from './AiFieldButton.vue';
import type { PosEntryFormState } from './card-form-state';
import ExampleListField from './ExampleListField.vue';
import type { PosType } from '@/types/card';

const props = defineProps<{
  /** For the "Word Form" placeholder, e.g. "Decision" for a "Decide" root word. */
  rootWord?: string;
}>();

const entries = defineModel<PosEntryFormState[]>('entries', { required: true });

const settingsStore = useSettingsStore();
const { mutateAsync: requestPartsOfSpeech, isPending: isGenerating, error: generateApiError } =
  useGeneratePartsOfSpeech();

const canGenerate = computed(
  () => hasRequiredAiCredentials(settingsStore.settings) && Boolean(props.rootWord?.trim()),
);
const generateErrorMessage = computed(() => {
  const error = generateApiError.value;
  if (!error) return '';
  return error instanceof AiServiceError ? error.message : 'Auto-fill failed. Please try again.';
});

async function handleGenerate() {
  const title = props.rootWord?.trim();
  if (!title) return;
  try {
    const result = await requestPartsOfSpeech({ settings: settingsStore.settings, title });
    entries.value = result.map(
      (entry): PosEntryFormState => ({
        id: crypto.randomUUID(),
        pos: entry.pos,
        wordForm: entry.wordForm?.trim() || title,
        definition: entry.definition,
        ipa: entry.ipa ?? '',
        examples: entry.examples ?? [],
      }),
    );
  } catch {
    // generateErrorMessage (computed above) already reflects the mutation's error state.
  }
}

const POS_OPTIONS: { value: PosType; label: string }[] = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'other', label: 'Other' },
];

function addEntry() {
  entries.value = [
    ...entries.value,
    { id: crypto.randomUUID(), pos: 'noun', wordForm: '', definition: '', ipa: '', examples: [] },
  ];
}

function removeEntry(id: string) {
  entries.value = entries.value.filter((entry) => entry.id !== id);
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between gap-2">
      <span class="flex items-center gap-1 text-xs font-medium text-text/60">
        Parts of Speech (Optional)
        <AiFieldButton
          :loading="isGenerating"
          :disabled="!canGenerate"
          :title="rootWord?.trim() ? 'Auto-fill this field with AI' : 'Enter a word first to use AI Auto-Fill'"
          @click="handleGenerate"
        />
      </span>
      <BaseButton
        variant="link"
        size="sm"
        @click="addEntry"
      >
        <AppIcon
          icon-name="Add"
          :size="12"
        />
        Add Part of Speech
      </BaseButton>
    </div>
    <p
      v-if="generateErrorMessage"
      class="mb-2 flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ generateErrorMessage }}
    </p>

    <div class="space-y-3">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="space-y-2 rounded border bg-card-surface border-text/10 p-3"
      >
        <div class="flex items-end gap-2">
          <BaseSelect
            :model-value="entry.pos"
            label="Type"
            class="w-36 shrink-0"
            :options="POS_OPTIONS"
            @update:model-value="(value) => (entry.pos = value as PosType)"
          />
          <BaseInput
            v-model="entry.wordForm"
            label="Word Form"
            :placeholder="rootWord ? `e.g. ${rootWord}...` : 'e.g. Decision'"
            class="w-full"
          />
        </div>

        <div class="flex items-end gap-2">
          <BaseInput
            v-model="entry.ipa"
            label="IPA (optional)"
            placeholder="/wɜːrd/"
            class="w-full"
          />
          <BaseButton
            variant="ghost"
            size="sm"
            muted
            class="shrink-0"
            @click="removeEntry(entry.id)"
          >
            <AppIcon
              icon-name="Trash"
              :size="12"
            />
            Remove
          </BaseButton>
        </div>

        <BaseInput
          v-model="entry.definition"
          label="Definition"
          placeholder="Meaning for this part of speech"
        />

        <ExampleListField
          v-model:examples="entry.examples"
          label="Examples"
        />
      </div>

      <p
        v-if="entries.length === 0"
        class="text-xs text-text/35"
      >
        No parts of speech added.
      </p>
    </div>
  </div>
</template>
