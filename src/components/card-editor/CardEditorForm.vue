<script setup lang="ts">
import type { CardFormState } from './card-form-state';
import DeckSelectField from './DeckSelectField.vue';
import ExampleListField from './ExampleListField.vue';
import ImageUploadField from './ImageUploadField.vue';
import PartsOfSpeechField from './PartsOfSpeechField.vue';
import PronunciationField from './PronunciationField.vue';
import QuizQuestionListField from './QuizQuestionListField.vue';
import TagMultiSelectField from './TagMultiSelectField.vue';

const draft = defineModel<CardFormState>('draft', { required: true });

defineProps<{
  isSaving?: boolean;
  submitLabel?: string;
}>();

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();
</script>

<template>
  <form
    class="mx-auto flex max-w-xl flex-col gap-5 pb-24"
    @submit.prevent="emit('submit')"
  >
    <div>
      <label
        for="front-title"
        class="mb-1 block text-xs font-medium text-gray-600"
        >Front Title / Question *</label
      >
      <input
        id="front-title"
        v-model="draft.frontTitle"
        type="text"
        required
        placeholder="e.g. Ubiquitous"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
      />
    </div>

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
