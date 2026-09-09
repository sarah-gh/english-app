<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import WarningIcon from '@/components/app/WarningIcon.vue';
import ActiveFiltersBar from '@/components/browse/ActiveFiltersBar.vue';
import AllCardsFilterBar from '@/components/browse/AllCardsFilterBar.vue';
import QuizCardSelectionList from '@/components/quiz-setup/QuizCardSelectionList.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import {
  useGenerateDescriptiveQuiz,
  useGenerateMultipleChoiceQuiz,
} from '@/queries/use-generate-ai-quiz';
import { hasRequiredAiCredentials } from '@/services/ai/ai-quiz-service';
import { AiServiceError } from '@/services/ai/errors';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useQuizSessionStore, type QuizSessionQuestion } from '@/stores/quiz-session-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import type { QuizMode } from '@/types/ai-quiz-result';
import type {
  DifficultyFilter,
  PosFilter,
  SortOption,
  StudyStatusFilter,
} from '@/types/card-filters';
import { stripHtmlToText } from '@/utils/html';
import { generateUUID } from '@/utils/uuid';

const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
const tagStore = useTagStore();
const settingsStore = useSettingsStore();
const quizSessionStore = useQuizSessionStore();

const isReady = ref(false);
const searchQuery = ref('');
const selectedDeckId = ref('');
const selectedTopicId = ref('');
const selectedTagIds = ref<string[]>([]);
const studyStatus = ref<StudyStatusFilter>('all');
const difficulty = ref<DifficultyFilter>('all');
const pos = ref<PosFilter>('all');
const sort = ref<SortOption>('created-desc');
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
/** Distinct from `generationApiError`: not an API failure, but a mapping failure, the provider
 *  responded successfully but its questions couldn't be matched back to the selected cards. */
const mappingError = ref('');

const generationError = computed(() => {
  if (mappingError.value) return mappingError.value;
  const error = generationApiError.value;
  if (!error) return '';
  return error instanceof AiServiceError
    ? error.message
    : 'Quiz generation failed. Please try again.';
});

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    topicStore.ensureLoaded(),
    tagStore.ensureLoaded(),
    settingsStore.ensureLoaded(),
  ]);
  isReady.value = true;
});

const hasApiKey = computed(() => hasRequiredAiCredentials(settingsStore.settings));

const MIN_QUESTIONS = 1;
const MAX_QUESTIONS = 30;

const canDecrementQuestions = computed(() => questionCount.value > MIN_QUESTIONS);
const canIncrementQuestions = computed(() => questionCount.value < MAX_QUESTIONS);

function decrementQuestionCount() {
  if (canDecrementQuestions.value) questionCount.value -= 1;
}

function incrementQuestionCount() {
  if (canIncrementQuestions.value) questionCount.value += 1;
}

function setQuestionCount(rawValue: string) {
  const parsed = Math.round(Number(rawValue));
  questionCount.value = Number.isFinite(parsed)
    ? Math.min(MAX_QUESTIONS, Math.max(MIN_QUESTIONS, parsed))
    : MIN_QUESTIONS;
}

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return cardStore.cards.filter((card) => {
    if (selectedDeckId.value && card.deckId !== selectedDeckId.value) return false;
    if (selectedTopicId.value && card.topicId !== selectedTopicId.value) return false;
    if (
      selectedTagIds.value.length > 0 &&
      !selectedTagIds.value.some((id) => card.tagIds.includes(id))
    ) {
      return false;
    }
    if (studyStatus.value === 'studied' && card.studyCount === 0) return false;
    if (studyStatus.value === 'unstudied' && card.studyCount > 0) return false;
    if (difficulty.value !== 'all' && card.reviewStatus !== difficulty.value) return false;
    if (pos.value !== 'all' && !card.partsOfSpeech?.some((entry) => entry.pos === pos.value))
      return false;
    if (query) {
      const haystack =
        `${card.frontTitle} ${stripHtmlToText(card.backAnswer)} ${card.hint ?? ''}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
});

const sortedCards = computed(() => {
  const list = [...filteredCards.value];
  switch (sort.value) {
    case 'alphabetical':
      return list.sort((a, b) => a.frontTitle.localeCompare(b.frontTitle));
    case 'study-count':
      return list.sort((a, b) => b.studyCount - a.studyCount);
    case 'last-reviewed':
      return list.sort(
        (a, b) => (b.reviewStats.lastReviewedAt ?? 0) - (a.reviewStats.lastReviewedAt ?? 0),
      );
    case 'created-desc':
    default:
      return list.sort((a, b) => b.createdAt - a.createdAt);
  }
});

const selectedCount = computed(() => selectedCardIds.value.size);

const STUDY_STATUS_LABELS: Record<Exclude<StudyStatusFilter, 'all'>, string> = {
  studied: 'Studied',
  unstudied: 'Unstudied',
};
const DIFFICULTY_LABELS: Record<Exclude<DifficultyFilter, 'all'>, string> = {
  new: 'New',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};
const POS_LABELS: Record<Exclude<PosFilter, 'all'>, string> = {
  noun: 'Noun',
  verb: 'Verb',
  adjective: 'Adjective',
  adverb: 'Adverb',
  other: 'Other',
};

const activeChips = computed(() => {
  const chips: { key: string; label: string }[] = [];
  if (searchQuery.value.trim())
    chips.push({ key: 'search', label: `Search: "${searchQuery.value.trim()}"` });
  if (selectedDeckId.value)
    chips.push({ key: 'deck', label: deckStore.getById(selectedDeckId.value)?.name ?? 'Deck' });
  if (selectedTopicId.value)
    chips.push({ key: 'topic', label: topicStore.getById(selectedTopicId.value)?.name ?? 'Topic' });
  for (const id of selectedTagIds.value) {
    const tag = tagStore.getById(id);
    if (tag) chips.push({ key: `tag:${id}`, label: tag.name });
  }
  if (studyStatus.value !== 'all')
    chips.push({ key: 'studyStatus', label: STUDY_STATUS_LABELS[studyStatus.value] });
  if (difficulty.value !== 'all')
    chips.push({ key: 'difficulty', label: DIFFICULTY_LABELS[difficulty.value] });
  if (pos.value !== 'all') chips.push({ key: 'pos', label: POS_LABELS[pos.value] });
  return chips;
});

function removeFilter(key: string) {
  if (key === 'search') searchQuery.value = '';
  else if (key === 'deck') {
    selectedDeckId.value = '';
    selectedTopicId.value = '';
  } else if (key === 'topic') selectedTopicId.value = '';
  else if (key.startsWith('tag:'))
    selectedTagIds.value = selectedTagIds.value.filter((id) => id !== key.slice(4));
  else if (key === 'studyStatus') studyStatus.value = 'all';
  else if (key === 'difficulty') difficulty.value = 'all';
  else if (key === 'pos') pos.value = 'all';
}

function clearAllFilters() {
  searchQuery.value = '';
  selectedDeckId.value = '';
  selectedTopicId.value = '';
  selectedTagIds.value = [];
  studyStatus.value = 'all';
  difficulty.value = 'all';
  pos.value = 'all';
}

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
            id: generateUUID(),
            cardId: sourceCard.id,
            cardTitle: sourceCard.frontTitle,
            question: question.question,
            options: question.options,
            correctOptionIndex: question.correctOptionIndex,
          };
        })
        .filter((question): question is QuizSessionQuestion => question !== null);

      if (questions.length === 0) {
        mappingError.value =
          "The AI's response couldn't be matched back to your selected cards. Please try again.";
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
            id: generateUUID(),
            cardId: sourceCard.id,
            cardTitle: sourceCard.frontTitle,
            question: question.question,
          };
        })
        .filter((question): question is QuizSessionQuestion => question !== null);

      if (questions.length === 0) {
        mappingError.value =
          "The AI's response couldn't be matched back to your selected cards. Please try again.";
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
  <div class="bg-background min-h-screen px-4 py-6">
    <RouterLink
      to="/"
      class="text-text/50 hover:text-primary mb-4 inline-flex items-center gap-1 text-sm"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Dashboard
    </RouterLink>
    <h1 class="text-card-gold mb-6 font-serif text-3xl font-bold">AI Quiz Generator</h1>

    <p
      v-if="!isReady"
      class="text-text/50 text-sm"
    >
      Loading…
    </p>

    <template v-else>
      <div
        v-if="!hasApiKey"
        class="border-primary/30 bg-card-definition relative mb-6 rounded-2xl border px-6 py-5"
      >
        <span
          class="border-primary/60 pointer-events-none absolute top-3 left-3 h-4 w-4 rounded-tl border-t border-l"
        />
        <span
          class="border-primary/60 pointer-events-none absolute top-3 right-3 h-4 w-4 rounded-tr border-t border-r"
        />
        <span
          class="border-primary/60 pointer-events-none absolute bottom-3 left-3 h-4 w-4 rounded-bl border-b border-l"
        />
        <span
          class="border-primary/60 pointer-events-none absolute right-3 bottom-3 h-4 w-4 rounded-br border-r border-b"
        />

        <p class="text-text mb-1 text-sm font-semibold">An AI provider API key is required</p>
        <p class="text-card-muted mb-3 text-xs">
          The AI Quiz Generator sends your selected cards to your configured AI provider (Gemini
          and/or AIHubMix) using your own key. Add one in Settings to continue.
        </p>
        <BaseButton
          variant="primary"
          size="sm"
          class="rounded-full!"
          to="/settings"
        >
          <AppIcon
            icon-name="Setting2"
            :size="14"
          />
          Go to Settings
        </BaseButton>
      </div>

      <div class="mb-4">
        <p class="text-card-gold mb-1.5 font-serif text-sm font-bold">Quiz Mode</p>
        <BaseSegmentedToggle
          v-model="quizMode"
          class="bg-card-definition"
          :options="QUIZ_MODE_OPTIONS"
        />
        <p class="text-card-muted mt-1.5 text-xs">
          {{
            quizMode === 'multiple-choice'
              ? 'Instantly scored, pick from 4 options per question.'
              : 'Type your own answers, an AI grades each one and gives feedback.'
          }}
        </p>
      </div>

      <div class="mb-4 w-full">
        <label
          for="question-count"
          class="text-card-gold mb-1.5 block font-serif text-sm font-bold"
        >
          Questions
        </label>
        <div
          class="border-text/10 flex w-full items-center rounded-xl border bg-black/5 p-1 dark:bg-slate-950/40"
        >
          <button
            type="button"
            aria-label="Decrease question count"
            class="text-text/60 hover:bg-text/10 hover:text-text flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            :disabled="!canDecrementQuestions"
            @click="decrementQuestionCount"
          >
            <AppIcon
              icon-name="Minus"
              :size="16"
            />
          </button>
          <input
            id="question-count"
            type="number"
            inputmode="numeric"
            min="1"
            max="30"
            :value="questionCount"
            class="text-text w-full [appearance:textfield] bg-transparent text-center text-sm font-semibold focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            @input="setQuestionCount(($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            aria-label="Increase question count"
            class="text-text/60 hover:bg-text/10 hover:text-text flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            :disabled="!canIncrementQuestions"
            @click="incrementQuestionCount"
          >
            <AppIcon
              icon-name="Add"
              :size="16"
            />
          </button>
        </div>
      </div>

      <BaseInput
        v-model="searchQuery"
        type="search"
        icon="SearchNormal1"
        placeholder="Search title, answer, or hint…"
        class="mb-3"
      />

      <AllCardsFilterBar
        v-model:deck-id="selectedDeckId"
        v-model:topic-id="selectedTopicId"
        v-model:tag-ids="selectedTagIds"
        v-model:study-status="studyStatus"
        v-model:difficulty="difficulty"
        v-model:pos="pos"
        v-model:sort="sort"
        :decks="deckStore.decks"
        :tags="tagStore.tags"
        class="mb-3"
      />

      <ActiveFiltersBar
        :chips="activeChips"
        @remove="removeFilter"
        @clear-all="clearAllFilters"
      />

      <p class="text-card-muted mb-3 text-xs">
        {{ sortedCards.length }} card{{ sortedCards.length === 1 ? '' : 's' }} match these filters
      </p>

      <div class="mb-6">
        <QuizCardSelectionList
          v-model="selectedCardIds"
          :cards="sortedCards"
        />
      </div>

      <BaseButton
        variant="ghost"
        block
        class="border-primary/50! text-primary! hover:border-primary! hover:bg-primary/10! relative rounded-full!"
        :disabled="!hasApiKey || selectedCount === 0"
        :loading="isGenerating"
        @click="handleGenerate"
      >
        <AppIcon
          v-if="!isGenerating"
          icon-name="Flash"
          :size="16"
        />
        {{
          isGenerating
            ? 'Generating…'
            : `Generate Quiz (${selectedCount} card${selectedCount === 1 ? '' : 's'})`
        }}
      </BaseButton>

      <p
        v-if="generationError"
        class="text-danger mt-3 flex items-center gap-1.5 text-xs font-medium"
      >
        <WarningIcon />
        {{ generationError }}
      </p>
    </template>
  </div>
</template>
