<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useGenerateAiQuiz } from '@/queries/use-generate-ai-quiz';
import { hasRequiredAiCredentials } from '@/services/ai/ai-quiz-service';
import { AiServiceError } from '@/services/ai/errors';
import { buildQuizPrompt } from '@/services/ai/quiz-prompt-builder';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useQuizSessionStore, type QuizSessionQuestion } from '@/stores/quiz-session-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';

const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const settingsStore = useSettingsStore();
const quizSessionStore = useQuizSessionStore();

const isReady = ref(false);
const selectedDeckId = ref('');
const selectedTagIds = ref<string[]>([]);
const selectedCardIds = ref<Set<string>>(new Set());

const {
  mutateAsync: generateQuiz,
  isPending: isGenerating,
  error: generationApiError,
} = useGenerateAiQuiz();
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
    tagStore.ensureLoaded(),
    settingsStore.ensureLoaded(),
  ]);
  isReady.value = true;
});

const hasApiKey = computed(() => hasRequiredAiCredentials(settingsStore.settings));

function toggleTagFilter(id: string) {
  selectedTagIds.value = selectedTagIds.value.includes(id)
    ? selectedTagIds.value.filter((tagId) => tagId !== id)
    : [...selectedTagIds.value, id];
}

const filteredCards = computed(() =>
  cardStore.cards.filter((card) => {
    if (selectedDeckId.value && card.deckId !== selectedDeckId.value) return false;
    if (
      selectedTagIds.value.length > 0 &&
      !selectedTagIds.value.some((id) => card.tagIds.includes(id))
    ) {
      return false;
    }
    return true;
  }),
);

function toggleCardSelection(id: string) {
  const next = new Set(selectedCardIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selectedCardIds.value = next;
}

function selectAllFiltered() {
  selectedCardIds.value = new Set(filteredCards.value.map((card) => card.id));
}

function clearSelection() {
  selectedCardIds.value = new Set();
}

const selectedCount = computed(() => selectedCardIds.value.size);

async function handleGenerate() {
  if (!hasApiKey.value) return;

  const selectedCards = cardStore.cards.filter((card) => selectedCardIds.value.has(card.id));
  if (selectedCards.length === 0) return;

  mappingError.value = '';
  try {
    const prompt = buildQuizPrompt(selectedCards);
    const generated = await generateQuiz({ settings: settingsStore.settings, prompt });

    const questions: QuizSessionQuestion[] = generated
      .map((question): QuizSessionQuestion | null => {
        const sourceCard = selectedCards[question.sourceIndex - 1];
        if (!sourceCard) return null;
        return {
          id: crypto.randomUUID(),
          cardId: sourceCard.id,
          cardTitle: sourceCard.frontTitle,
          type: question.type,
          question: question.question,
          options: question.options,
          correctAnswer: question.correctAnswer,
        };
      })
      .filter((question): question is QuizSessionQuestion => question !== null);

    if (questions.length === 0) {
      mappingError.value = "Gemini's response couldn't be matched back to your selected cards. Please try again.";
      return;
    }

    quizSessionStore.setQuestions(questions);
    router.push('/ai-quiz/session');
  } catch {
    // generationError (computed above) already reflects the mutation's error state.
  }
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6">
    <RouterLink
      to="/"
      class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Dashboard
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-text">AI Quiz Generator</h1>

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>

    <template v-else>
      <div
        v-if="!hasApiKey"
        class="mb-6 rounded-lg border-2 border-primary/30 p-4"
      >
        <p class="mb-1 text-sm font-semibold text-text">An AI provider API key is required</p>
        <p class="mb-3 text-xs text-text/60">
          The AI Quiz Generator sends your selected cards to your configured AI provider (Gemini
          and/or AIHubMix) using your own key. Add one in Settings to continue.
        </p>
        <BaseButton
          variant="primary"
          size="sm"
          to="/settings"
        >
          Go to Settings
        </BaseButton>
      </div>

      <div class="mb-3 flex gap-2">
        <BaseSelect
          v-model="selectedDeckId"
          class="w-full"
        >
          <option value="">All decks</option>
          <option
            v-for="deck in deckStore.decks"
            :key="deck.id"
            :value="deck.id"
          >
            {{ deck.name }}
          </option>
        </BaseSelect>
      </div>

      <div
        v-if="tagStore.tags.length > 0"
        class="mb-4 flex flex-wrap gap-2"
      >
        <button
          v-for="tag in tagStore.tags"
          :key="tag.id"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors"
          :class="
            selectedTagIds.includes(tag.id)
              ? 'border-primary bg-primary text-background'
              : 'border-text/15 text-text/70 hover:border-primary'
          "
          @click="toggleTagFilter(tag.id)"
        >
          <span
            class="h-2 w-2 rounded-full"
            :style="{ backgroundColor: tag.color }"
          />
          {{ tag.name }}
        </button>
      </div>

      <div class="mb-3 flex items-center justify-between">
        <p class="text-xs text-text/50">{{ selectedCount }} of {{ filteredCards.length }} selected</p>
        <div class="flex gap-3">
          <BaseButton
            variant="link"
            size="sm"
            @click="selectAllFiltered"
          >
            Select All
          </BaseButton>
          <BaseButton
            variant="link"
            size="sm"
            muted
            @click="clearSelection"
          >
            Clear
          </BaseButton>
        </div>
      </div>

      <BaseCard
        padding="none"
        class="mb-6"
      >
        <ul class="divide-y divide-text/10">
          <li
            v-for="card in filteredCards"
            :key="card.id"
          >
            <label class="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-primary/5">
              <input
                type="checkbox"
                class="h-4 w-4 accent-primary"
                :checked="selectedCardIds.has(card.id)"
                @change="toggleCardSelection(card.id)"
              />
              <span class="min-w-0 flex-1 truncate text-sm text-text">{{ card.frontTitle }}</span>
              <span class="shrink-0 text-xs text-text/50">
                {{ deckStore.getById(card.deckId)?.name }}
              </span>
            </label>
          </li>
          <li
            v-if="filteredCards.length === 0"
            class="px-4 py-3 text-sm text-text/35"
          >
            No cards match these filters.
          </li>
        </ul>
      </BaseCard>

      <BaseButton
        variant="primary"
        block
        :disabled="!hasApiKey || selectedCount === 0"
        :loading="isGenerating"
        @click="handleGenerate"
      >
        {{ isGenerating ? 'Generating…' : `Generate Quiz (${selectedCount} card${selectedCount === 1 ? '' : 's'})` }}
      </BaseButton>

      <p
        v-if="generationError"
        class="mt-3 flex items-center gap-1.5 text-xs font-medium text-danger"
      >
        <WarningIcon />
        {{ generationError }}
      </p>
    </template>
  </div>
</template>
