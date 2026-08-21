<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { computed, ref, watch } from 'vue';
import { useField, useForm } from 'vee-validate';
import { RouterLink } from 'vue-router';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseAutocomplete from '@/components/ui/BaseAutocomplete.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useWordAutocomplete, type WordSuggestion } from '@/composables/useWordAutocomplete';
import { useAutofillCardDetails } from '@/queries/use-autofill-card-details';
import { useAutofillWordFamily } from '@/queries/use-autofill-word-family';
import { hasRequiredAiCredentials } from '@/services/ai/ai-card-autofill-service';
import type { GeneratedCardDetails } from '@/services/ai/card-autofill-schema';
import { AiServiceError } from '@/services/ai/errors';
import type { GeneratedWordFamily } from '@/services/ai/word-family-schema';
import { cardEditorSchema, type CardEditorValidationValues } from '@/schemas/cardSchema';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import type { CardFormState, CardMode, PosEntryFormState } from './card-form-state';
import DeckSelectField from './DeckSelectField.vue';
import ExampleListField from './ExampleListField.vue';
import ImageUploadField from './ImageUploadField.vue';
import PartsOfSpeechField from './PartsOfSpeechField.vue';
import PronunciationField from './PronunciationField.vue';
import QuizQuestionListField from './QuizQuestionListField.vue';
import TagMultiSelectField from './TagMultiSelectField.vue';
import WordFamilyField from './WordFamilyField.vue';

const draft = defineModel<CardFormState>('draft', { required: true });

defineProps<{
  isSaving?: boolean;
  isEditing?: boolean;
}>();

const emit = defineEmits<{
  submit: ['add-another' | 'exit'];
  cancel: [];
}>();

const deckStore = useDeckStore();
const settingsStore = useSettingsStore();
const tagStore = useTagStore();

function validationSnapshot(): CardEditorValidationValues {
  return {
    cardMode: draft.value.cardMode,
    frontTitle: draft.value.frontTitle,
    deckId: draft.value.deckId,
    backAnswer: draft.value.backAnswer,
    wordFamily: {
      noun: { ...draft.value.wordFamily.noun },
      verb: { ...draft.value.wordFamily.verb },
      adjective: { ...draft.value.wordFamily.adjective },
      adverb: { ...draft.value.wordFamily.adverb },
      usageNotes: draft.value.wordFamily.usageNotes,
    },
  };
}

const { handleSubmit, setValues, resetForm, meta: formMeta, errors: formErrors } = useForm<CardEditorValidationValues>({
  validationSchema: toTypedSchema(cardEditorSchema),
  initialValues: validationSnapshot(),
});

const { errorMessage: frontTitleError, meta: frontTitleMeta, handleBlur: touchFrontTitle } = useField<string>('frontTitle');
const { errorMessage: deckIdError, meta: deckIdMeta, handleBlur: touchDeckId } = useField<string>('deckId');
const { errorMessage: backAnswerError, meta: backAnswerMeta, handleBlur: touchBackAnswer } = useField<string>('backAnswer');
/** `useField('wordFamily')` doesn't surface schema errors attached to this object-typed (non-leaf)
 *  path — vee-validate's per-field validate only resolves leaf paths — so this reads the same
 *  error straight off the form's schema-validation result instead. */
const wordFamilyError = computed(() => formErrors.value.wordFamily);

/** Keeps the Zod-backed validation state in sync with `draft` — including AI Auto-Fill, which
 *  writes straight into `draft` rather than going through vee-validate's own setters. */
watch(() => validationSnapshot(), (values) => setValues(values, true), { deep: true });

/** Called by the parent after it resets `draft` for "Save & Add Another", so the next card starts
 *  with a clean, untouched form instead of immediately showing errors for the fields just cleared. */
function resetValidation() {
  resetForm({ values: validationSnapshot() });
}

defineExpose({ resetValidation });

const submitAddAnother = handleSubmit(() => emit('submit', 'add-another'));
const submitExit = handleSubmit(() => emit('submit', 'exit'));

function selectCardMode(mode: CardMode) {
  draft.value.cardMode = mode;
}

/** Picking the "Word Families" deck switches the card into Word Family mode automatically — the
 *  user can still switch back manually afterward. */
watch(
  () => draft.value.deckId,
  (deckId) => {
    const deck = deckStore.getById(deckId);
    if (deck && /word families/i.test(deck.name) && draft.value.cardMode !== 'word-family') {
      draft.value.cardMode = 'word-family';
    }
  },
);

const frontTitleQuery = computed(() => draft.value.frontTitle);
const { suggestions: frontTitleSuggestions, isLoading: isSuggestingFrontTitle } =
  useWordAutocomplete(frontTitleQuery);

const hasAiCredentials = computed(() => hasRequiredAiCredentials(settingsStore.settings));
const canAutofill = computed(
  () => hasAiCredentials.value && draft.value.frontTitle.trim().length > 0 && !isAutofilling.value,
);

const { mutateAsync: requestCardAutofill, isPending: isCardAutofilling, error: cardAutofillApiError } = useAutofillCardDetails();
const { mutateAsync: requestWordFamilyAutofill, isPending: isWordFamilyAutofilling, error: wordFamilyAutofillApiError } = useAutofillWordFamily();

const isAutofilling = computed(() => isCardAutofilling.value || isWordFamilyAutofilling.value);

/** Cleared on every attempt; set only if the response couldn't be applied for a non-API reason. */
const autofillLocalError = ref('');

const autofillErrorMessage = computed(() => {
  if (autofillLocalError.value) return autofillLocalError.value;
  const error = draft.value.cardMode === 'word-family' ? wordFamilyAutofillApiError.value : cardAutofillApiError.value;
  if (!error) return '';
  return error instanceof AiServiceError ? error.message : 'Auto-fill failed. Please try again.';
});

async function handleAutofill() {
  const title = draft.value.frontTitle.trim();
  if (!title) return;

  autofillLocalError.value = '';
  try {
    if (draft.value.cardMode === 'word-family') {
      const result = await requestWordFamilyAutofill({ settings: settingsStore.settings, rootWord: title });
      applyWordFamilyResult(result);
    } else {
      const deckName = deckStore.getById(draft.value.deckId)?.name;
      const result = await requestCardAutofill({ settings: settingsStore.settings, title, deckName });
      await applyAutofillResult(result);
    }
  } catch {
    // autofillErrorMessage (computed above) already reflects the mutation's error state.
  }
}

async function applyAutofillResult(result: GeneratedCardDetails): Promise<void> {
  draft.value.backAnswer = result.backAnswer;
  if (result.ipa) draft.value.ipa = result.ipa;
  if (result.hint) draft.value.hint = result.hint;
  if (result.personalExamples.length > 0) draft.value.examples = result.personalExamples;

  if (result.partsOfSpeech && result.partsOfSpeech.length > 0) {
    draft.value.partsOfSpeech = result.partsOfSpeech.map(
      (entry): PosEntryFormState => ({
        id: crypto.randomUUID(),
        pos: entry.pos,
        wordForm: entry.wordForm ?? '',
        definition: entry.definition,
        ipa: entry.ipa ?? '',
        examples: entry.examples ?? [],
      }),
    );
  }

  await applySuggestedDeck(result.suggestedDeckCategory);
  await applySuggestedTags(result.suggestedTags);
}

function applyWordFamilyResult(result: GeneratedWordFamily): void {
  const toFormState = (detail?: { word: string; meaning?: string; example?: string }) => ({
    word: detail?.word ?? '',
    meaning: detail?.meaning ?? '',
    example: detail?.example ?? '',
  });
  draft.value.wordFamily.noun = toFormState(result.noun);
  draft.value.wordFamily.verb = toFormState(result.verb);
  draft.value.wordFamily.adjective = toFormState(result.adjective);
  draft.value.wordFamily.adverb = toFormState(result.adverb);
  if (result.usageNotes) draft.value.wordFamily.usageNotes = result.usageNotes;
  if (result.ipa) draft.value.ipa = result.ipa;

  // The card is already known to be a Word Family card, so the category is deterministic —
  // no need to ask the AI to (re-)classify it the way `applySuggestedDeck` does for standard cards.
  void applySuggestedDeck('Word Families');
  void applySuggestedTags(result.suggestedTags);
}

/** Auto-selects a deck matching the AI-suggested category when the user hasn't already picked
 *  one — reusing an existing deck of that name if one exists, otherwise creating it (mirroring
 *  how `applySuggestedTags` resolves-or-creates tags below). */
async function applySuggestedDeck(categoryName: string | undefined): Promise<void> {
  if (draft.value.deckId || !categoryName) return;
  const name = categoryName.trim();
  if (!name) return;

  const existing = deckStore.decks.find((deck) => deck.name.toLowerCase() === name.toLowerCase());
  const deck = existing ?? (await deckStore.add({ name }));
  draft.value.deckId = deck.id;
}

async function applySuggestedTags(suggestedTags: string[]): Promise<void> {
  if (suggestedTags.length === 0) return;

  const resolvedTagIds: string[] = [];
  for (const rawName of suggestedTags) {
    const name = rawName.replace(/^#/, '').trim();
    if (!name) continue;
    const existing = tagStore.tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
    const tag = existing ?? (await tagStore.add({ name, color: '#6b7280' }));
    resolvedTagIds.push(tag.id);
  }
  draft.value.tagIds = Array.from(new Set([...draft.value.tagIds, ...resolvedTagIds]));
}
</script>

<template>
  <form
    class="mx-auto flex max-w-xl flex-col gap-5 pb-24"
    @submit.prevent="isEditing ? submitExit() : submitAddAnother()"
  >
    <div>
      <p class="mb-1 text-xs font-medium text-gray-600">Card Type</p>
      <BaseSegmentedToggle
        :model-value="draft.cardMode"
        :options="[
          { value: 'standard', label: 'Standard Card' },
          { value: 'word-family', label: 'Word Family Card' },
        ]"
        @update:model-value="selectCardMode"
      />
    </div>

    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <label
          for="front-title"
          class="block text-xs font-medium text-gray-600"
          >{{ draft.cardMode === 'word-family' ? 'Root / Base Word *' : 'Front Title / Question *' }}</label
        >
        <BaseButton
          type="button"
          variant="secondary"
          size="sm"
          :disabled="!canAutofill"
          :loading="isAutofilling"
          @click="handleAutofill"
        >
          ✨ {{ isAutofilling ? 'Auto-Filling…' : 'Auto-Fill with AI' }}
        </BaseButton>
      </div>
      <BaseAutocomplete
        id="front-title"
        v-model="draft.frontTitle"
        :items="frontTitleSuggestions"
        :loading="isSuggestingFrontTitle"
        :invalid="frontTitleMeta.touched && Boolean(frontTitleError)"
        :placeholder="draft.cardMode === 'word-family' ? 'e.g. Success' : 'e.g. Ubiquitous'"
        @blur="touchFrontTitle"
      >
        <template #item="{ item }: { item: WordSuggestion }">
          <span class="flex items-center justify-between gap-2">
            {{ item.value }}
            <span
              v-if="item.source === 'existing'"
              class="shrink-0 rounded-full border border-gray-300 px-1.5 py-0.5 text-[10px] font-medium text-gray-500"
            >
              Your card
            </span>
          </span>
        </template>
      </BaseAutocomplete>
      <p
        v-if="!hasAiCredentials"
        class="mt-1 text-xs text-gray-500"
      >
        <RouterLink
          to="/settings"
          class="underline hover:no-underline"
          >Configure an AI provider in Settings</RouterLink
        >
        to use Auto-Fill.
      </p>
      <p
        v-if="frontTitleMeta.touched && frontTitleError"
        class="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-800"
      >
        <WarningIcon />
        {{ frontTitleError }}
      </p>
      <p
        v-if="autofillErrorMessage"
        class="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-800"
      >
        <WarningIcon />
        {{ autofillErrorMessage }}
      </p>
    </div>

    <WordFamilyField
      v-if="draft.cardMode === 'word-family'"
      v-model:data="draft.wordFamily"
      :root-word="draft.frontTitle"
      :error="formMeta.touched ? wordFamilyError : undefined"
    />
    <template v-else>
      <div>
        <label
          for="back-answer"
          class="mb-1 block text-xs font-medium text-gray-600"
          >Back Answer / Explanation *</label
        >
        <textarea
          id="back-answer"
          v-model="draft.backAnswer"
          rows="3"
          placeholder="e.g. Present, appearing, or found everywhere."
          class="w-full rounded border px-3 py-2 text-sm focus:border-black focus:outline-none"
          :class="backAnswerMeta.touched && backAnswerError ? 'border-red-500/80' : 'border-gray-300'"
          @blur="touchBackAnswer"
        />
        <p
          v-if="backAnswerMeta.touched && backAnswerError"
          class="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-800"
        >
          <WarningIcon />
          {{ backAnswerError }}
        </p>
      </div>

      <PartsOfSpeechField
        v-model:entries="draft.partsOfSpeech"
        :root-word="draft.frontTitle"
      />
    </template>

    <DeckSelectField
      v-model:deck-id="draft.deckId"
      :error="deckIdMeta.touched ? deckIdError : undefined"
      @blur="touchDeckId"
    />
    <TagMultiSelectField v-model:tag-ids="draft.tagIds" />

    <PronunciationField
      v-model:ipa="draft.ipa"
      v-model:audio-blob="draft.audioBlob"
      v-model:tts-enabled="draft.ttsEnabled"
      :word="draft.frontTitle"
    />

    <div>
      <label
        for="hint"
        class="mb-1 block text-xs font-medium text-gray-600"
        >Hint / Hidden Section (optional)</label
      >
      <input
        id="hint"
        v-model="draft.hint"
        type="text"
        placeholder="Revealed via tap during review"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
      />
    </div>

    <ExampleListField v-model:examples="draft.examples" />
    <QuizQuestionListField v-model:quiz-questions="draft.quizQuestions" />
    <ImageUploadField v-model:image-blob="draft.imageBlob" />

    <div class="fixed inset-x-0 bottom-0 flex gap-3 border-t border-gray-200 bg-white p-4">
      <button
        type="button"
        class="flex-1 rounded border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:border-black hover:text-black"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        v-if="!isEditing"
        type="button"
        :disabled="isSaving || (formMeta.touched && !formMeta.valid)"
        class="flex-1 rounded border border-black py-2.5 text-sm font-medium text-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
        @click="submitExit"
      >
        {{ isSaving ? 'Saving…' : 'Save & Exit' }}
      </button>
      <button
        type="submit"
        :disabled="isSaving || (formMeta.touched && !formMeta.valid)"
        class="flex-1 rounded bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400"
      >
        {{ isSaving ? 'Saving…' : isEditing ? 'Save Changes' : 'Save & Add Another' }}
      </button>
    </div>
  </form>
</template>
