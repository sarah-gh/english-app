<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
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
import { generateUUID } from '@/utils/uuid';

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
        id: generateUUID(),
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

/** Keyed by entry id so the newly added entry's element can be found and scrolled into view
 *  without relying on array-index refs shifting around as entries are added/removed. */
const entryEls = ref<Record<string, HTMLElement | undefined>>({});

function setEntryRef(id: string, el: Element | null) {
  entryEls.value[id] = (el as HTMLElement) ?? undefined;
}

async function addEntry() {
  const id = generateUUID();
  entries.value = [
    ...entries.value,
    { id, pos: 'noun', wordForm: '', definition: '', ipa: '', examples: [] },
  ];
  await nextTick();
  entryEls.value[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function removeEntry(id: string) {
  entries.value = entries.value.filter((entry) => entry.id !== id);
  delete entryEls.value[id];
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
        :ref="(el) => setEntryRef(entry.id, el as Element | null)"
        class="relative space-y-2 rounded border bg-card-surface border-text/10 p-3 pt-4"
      >
        <button
          type="button"
          aria-label="Remove this part of speech"
          class="absolute right-1 top-1 rounded-lg p-2 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
          @click="removeEntry(entry.id)"
        >
          <AppIcon
            icon-name="Trash"
            :size="16"
          />
        </button>

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

        <BaseInput
          v-model="entry.ipa"
          label="IPA (optional)"
          placeholder="/wɜːrd/"
        />

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

      <BaseButton
        variant="ghost"
        size="sm"
        block
        @click="addEntry"
      >
        <AppIcon
          icon-name="Add"
          :size="14"
        />
        Add Another Part of Speech
      </BaseButton>
    </div>
  </div>
</template>
