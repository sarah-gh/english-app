<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import WarningIcon from '@/components/app/WarningIcon.vue';
import QuizCardSelectionList from '@/components/quiz-setup/QuizCardSelectionList.vue';
import QuizFilterControls from '@/components/quiz-setup/QuizFilterControls.vue';
import QuizTagFilter from '@/components/quiz-setup/QuizTagFilter.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useGenerateDescriptiveQuiz, useGenerateMultipleChoiceQuiz } from '@/queries/use-generate-ai-quiz';
import { hasRequiredAiCredentials } from '@/services/ai/ai-quiz-service';
import { AiServiceError } from '@/services/ai/errors';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useQuizSessionStore, type QuizSessionQuestion } from '@/stores/quiz-session-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTopicStore } from '@/stores/topic-store';
import type { QuizMode } from '@/types/ai-quiz-result';

const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
const settingsStore = useSettingsStore();
const quizSessionStore = useQuizSessionStore();

const isReady = ref(false);
const selectedDeckId = ref('');
const selectedTopicId = ref('');
const selectedTagIds = ref<string[]>([]);
const selectedCardIds = ref<Set<string>>(new Set());
const quizMode = ref<QuizMode>('multiple-choice');
const questionCount = ref(10);

const QUIZ_MODE_OPTIONS = [
  { value: 'multiple-choice' as const, label: 'Multiple Choice', color: 'gold' as const },
  { value: 'open-ended' as const, label: 'Open-Ended', color: 'gold' as const },
];

const mcMutation = useGenerateMultipleChoiceQuiz();
const descMutation = useGenerateDescriptiveQuiz();

const isGenerating = computed(() =>
  quizMode.value === 'multiple-choice' ? mcMutation.isPending.value : descMutation.isPending.value,
);
const generationApiError = computed(() =>
  quizMode.value === 'multiple-choice' ? mcMutation.error.value : descMutation.error.value,
);
/** Distinct from `generationApiError`: not an API failure, but a mapping failure — the provider
 *  responded successfully but its questions couldn't be matched back to the selected cards. */
const mappingError = ref('');

const generationError = computed(() => {
  if (mappingError.value) return mappingError.value;
  const error = generationApiError.value;
  if (!error) return '';
  return error instanceof AiServiceError ? error.message : 'Quiz generation failed. Please try again.';
});

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    topicStore.ensureLoaded(),
    settingsStore.ensureLoaded(),
  ]);
  isReady.value = true;
});

const hasApiKey = computed(() => hasRequiredAiCredentials(settingsStore.settings));

const filteredCards = computed(() =>
  cardStore.cards.filter((card) => {
    if (selectedDeckId.value && card.deckId !== selectedDeckId.value) return false;
    if (selectedTopicId.value && card.topicId !== selectedTopicId.value) return false;
    if (
      selectedTagIds.value.length > 0 &&
      !selectedTagIds.value.some((id) => card.tagIds.includes(id))
    ) {
      return false;
    }
    return true;
  }),
);

const selectedCount = computed(() => selectedCardIds.value.size);

async function handleGenerate() {
  if (!hasApiKey.value) return;

  const selectedCards = cardStore.cards.filter((card) => selectedCardIds.value.has(card.id));
  if (selectedCards.length === 0) return;

  mappingError.value = '';
  try {
    if (quizMode.value === 'multiple-choice') {
      const generated = await mcMutation.mutateAsync({
        settings: settingsStore.settings,
        cards: selectedCards,
        questionCount: questionCount.value,
      });

      const questions: QuizSessionQuestion[] = generated
        .map((question): QuizSessionQuestion | null => {
          const sourceCard = selectedCards[question.sourceIndex - 1];
          if (!sourceCard) return null;
          return {
            id: crypto.randomUUID(),
            cardId: sourceCard.id,
            cardTitle: sourceCard.frontTitle,
            question: question.question,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
          };
        })
        .filter((question): question is QuizSessionQuestion => question !== null);

      if (questions.length === 0) {
        mappingError.value = "The AI's response couldn't be matched back to your selected cards. Please try again.";
        return;
      }

      quizSessionStore.setQuestions('multiple-choice', questions);
    } else {
      const generated = await descMutation.mutateAsync({
        settings: settingsStore.settings,
        cards: selectedCards,
        questionCount: questionCount.value,
      });

      const questions: QuizSessionQuestion[] = generated
        .map((question): QuizSessionQuestion | null => {
          const sourceCard = selectedCards[question.sourceIndex - 1];
          if (!sourceCard) return null;
          return {
            id: crypto.randomUUID(),
            cardId: sourceCard.id,
            cardTitle: sourceCard.frontTitle,
            question: question.question,
          };
        })
        .filter((question): question is QuizSessionQuestion => question !== null);

      if (questions.length === 0) {
        mappingError.value = "The AI's response couldn't be matched back to your selected cards. Please try again.";
        return;
      }

      quizSessionStore.setQuestions('open-ended', questions);
    }

    router.push('/ai-quiz/session');
  } catch {
    // generationError (computed above) already reflects the mutation's error state.
  }
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6">
    <RouterLink to="/" class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary">
      <AppIcon icon-name="ArrowLeft" :size="14" />
      Dashboard
    </RouterLink>
    <h1 class="mb-6 font-serif text-3xl font-bold text-card-gold">AI Quiz Generator</h1>

    <p v-if="!isReady" class="text-sm text-text/50">
      Loading…
    </p>

    <template v-else>
      <div
        v-if="!hasApiKey"
        class="relative mb-6 rounded-2xl border border-primary/30 bg-card-definition px-6 py-5"
      >
        <span class="pointer-events-none absolute top-3 left-3 h-4 w-4 rounded-tl border-t border-l border-primary/60" />
        <span class="pointer-events-none absolute top-3 right-3 h-4 w-4 rounded-tr border-t border-r border-primary/60" />
        <span class="pointer-events-none absolute bottom-3 left-3 h-4 w-4 rounded-bl border-b border-l border-primary/60" />
        <span class="pointer-events-none absolute right-3 bottom-3 h-4 w-4 rounded-br border-r border-b border-primary/60" />

        <p class="mb-1 text-sm font-semibold text-text">An AI provider API key is required</p>
        <p class="mb-3 text-xs text-card-muted">
          The AI Quiz Generator sends your selected cards to your configured AI provider (Gemini
          and/or AIHubMix) using your own key. Add one in Settings to continue.
        </p>
        <BaseButton variant="primary" size="sm" class="rounded-full!" to="/settings">
          <AppIcon icon-name="Setting2" :size="14" />
          Go to Settings
        </BaseButton>
      </div>

      <div class="mb-4">
        <p class="mb-1.5 font-serif text-sm font-bold text-card-gold">Quiz Mode</p>
        <BaseSegmentedToggle v-model="quizMode" class="bg-card-definition" :options="QUIZ_MODE_OPTIONS" />
        <p class="mt-1.5 text-xs text-card-muted">
          {{
            quizMode === 'multiple-choice'
              ? 'Instantly scored — pick from 4 options per question.'
              : 'Type your own answers — an AI grades each one and gives feedback.'
          }}
        </p>
      </div>

      <div class="mb-4">
        <QuizFilterControls
          v-model:question-count="questionCount"
          v-model:deck-id="selectedDeckId"
          v-model:topic-id="selectedTopicId"
        />
      </div>

      <div class="mb-4">
        <QuizTagFilter v-model="selectedTagIds" />
      </div>

      <div class="mb-6">
        <QuizCardSelectionList v-model="selectedCardIds" :cards="filteredCards" />
      </div>

      <BaseButton
        variant="ghost"
        block
        class="relative rounded-full! border-primary/50! text-primary! hover:border-primary! hover:bg-primary/10!"
        :disabled="!hasApiKey || selectedCount === 0"
        :loading="isGenerating"
        @click="handleGenerate"
      >
        <AppIcon v-if="!isGenerating" icon-name="Flash" :size="16" />
        {{ isGenerating ? 'Generating…' : `Generate Quiz (${selectedCount} card${selectedCount === 1 ? '' : 's'})` }}
      </BaseButton>

      <p v-if="generationError" class="mt-3 flex items-center gap-1.5 text-xs font-medium text-danger">
        <WarningIcon />
        {{ generationError }}
      </p>
    </template>
  </div>
</template>
