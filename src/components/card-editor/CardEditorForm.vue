<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useAutofillCardDetails } from '@/queries/use-autofill-card-details';
import { useAutofillWordFamily } from '@/queries/use-autofill-word-family';
import { hasRequiredAiCredentials } from '@/services/ai/ai-card-autofill-service';
import type { GeneratedCardDetails } from '@/services/ai/card-autofill-schema';
import { AiServiceError } from '@/services/ai/errors';
import type { GeneratedWordFamily } from '@/services/ai/word-family-schema';
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
  submitLabel?: string;
}>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();

const deckStore = useDeckStore();
const settingsStore = useSettingsStore();
const tagStore = useTagStore();

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
  if (result.examples.length > 0) draft.value.examples = result.examples;

  if (result.partsOfSpeech && result.partsOfSpeech.length > 0) {
    draft.value.partsOfSpeech = result.partsOfSpeech.map(
      (entry): PosEntryFormState => ({
        id: crypto.randomUUID(),
        pos: entry.pos,
        definition: entry.definition,
        ipa: entry.ipa ?? '',
        examples: entry.examples ?? [],
      }),
    );
  }

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

  void applySuggestedTags(result.suggestedTags);
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
    @submit.prevent="emit('submit')"
  >
    <div>
      <p class="mb-1 text-xs font-medium text-gray-600">Card Type</p>
      <div class="flex rounded-lg border border-black p-1">
        <button
          type="button"
          class="flex-1 rounded py-2 text-sm font-medium transition-colors"
          :class="draft.cardMode === 'standard' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'"
          @click="selectCardMode('standard')"
        >
          Standard Card
        </button>
        <button
          type="button"
          class="flex-1 rounded py-2 text-sm font-medium transition-colors"
          :class="draft.cardMode === 'word-family' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'"
          @click="selectCardMode('word-family')"
        >
          Word Family Card
        </button>
      </div>
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
      <input
        id="front-title"
        v-model="draft.frontTitle"
        type="text"
        required
        :placeholder="draft.cardMode === 'word-family' ? 'e.g. Success' : 'e.g. Ubiquitous'"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
      />
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
          required
          rows="3"
          placeholder="e.g. Present, appearing, or found everywhere."
          class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        />
      </div>

      <PartsOfSpeechField v-model:entries="draft.partsOfSpeech" />
    </template>

    <DeckSelectField v-model:deck-id="draft.deckId" />
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
        type="submit"
        :disabled="isSaving"
        class="flex-1 rounded bg-black py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:bg-gray-400"
      >
        {{ isSaving ? 'Saving…' : (submitLabel ?? 'Save Card') }}
      </button>
    </div>
  </form>
</template>
