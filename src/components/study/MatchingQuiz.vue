<script setup lang="ts">
import { computed, ref } from 'vue';
import MatchColumnItem from '@/components/study/MatchColumnItem.vue';
import type { MatchingQuizChunk } from '@/services/review/matching-quiz';
import type { MatchResult } from '@/stores/study-session-store';

const props = defineProps<{
  chunk: MatchingQuizChunk;
}>();

const emit = defineEmits<{ complete: [results: MatchResult[]] }>();

type ItemStatus = 'pending' | 'selected' | 'correct' | 'incorrect' | 'matched';

const wordStatus = ref<Map<string, ItemStatus>>(new Map(props.chunk.words.map((item) => [item.cardId, 'pending'])));
const meaningStatus = ref<Map<string, ItemStatus>>(
  new Map(props.chunk.meanings.map((item) => [item.cardId, 'pending'])),
);
const selectedWordId = ref<string | null>(null);
const isResolving = ref(false);
/** Cards that got at least one wrong attempt this round — tried-until-correct still finishes the
 *  quiz, but any card that ever missed is reported as failed so it's requeued later. */
const failedCardIds = ref<Set<string>>(new Set());

const matchedCount = computed(
  () => [...wordStatus.value.values()].filter((status) => status === 'correct').length,
);

function wordStatusFor(cardId: string): ItemStatus {
  const status = wordStatus.value.get(cardId) ?? 'pending';
  // 'incorrect'/'correct' are the settled outcome of a just-made guess and must win over the
  // transient 'selected' highlight, so the word flashes red alongside its meaning on a miss.
  if (status !== 'pending') return status;
  return selectedWordId.value === cardId ? 'selected' : 'pending';
}

function selectWord(cardId: string) {
  if (isResolving.value || wordStatus.value.get(cardId) === 'correct') return;
  selectedWordId.value = selectedWordId.value === cardId ? null : cardId;
}

function selectMeaning(meaningCardId: string) {
  if (isResolving.value || !selectedWordId.value || meaningStatus.value.get(meaningCardId) === 'matched') return;

  const wordCardId = selectedWordId.value;
  const isCorrect = meaningCardId === wordCardId;

  isResolving.value = true;
  if (isCorrect) {
    wordStatus.value.set(wordCardId, 'correct');
    meaningStatus.value.set(meaningCardId, 'matched');
  } else {
    failedCardIds.value.add(wordCardId);
    wordStatus.value.set(wordCardId, 'incorrect');
    meaningStatus.value.set(meaningCardId, 'incorrect');
  }

  window.setTimeout(() => {
    // Wrong guesses are never locked — both the word and the meaning reset to pending so the
    // user can keep trying until they find the right pair.
    if (!isCorrect) {
      wordStatus.value.set(wordCardId, 'pending');
      meaningStatus.value.set(meaningCardId, 'pending');
    }
    selectedWordId.value = null;
    isResolving.value = false;

    if (matchedCount.value >= props.chunk.words.length) {
      const results: MatchResult[] = props.chunk.words.map((item) => ({
        cardId: item.cardId,
        correct: !failedCardIds.value.has(item.cardId),
      }));
      emit('complete', results);
    }
  }, 450);
}
</script>

<template>
  <div class="mx-auto w-full max-w-sm">
    <p class="mb-1 text-center text-base font-medium text-text">Match each word to its meaning</p>
    <p class="mb-4 text-center text-xs text-text/50">Tap a word, then tap its matching meaning. Keep trying until every pair is correct.</p>

    <div class="grid grid-cols-2 gap-3">
      <div class="flex flex-col gap-2">
        <MatchColumnItem
          v-for="item in chunk.words"
          :key="item.cardId"
          :text="item.word"
          :status="wordStatusFor(item.cardId)"
          @click="selectWord(item.cardId)"
        />
      </div>
      <div class="flex flex-col gap-2">
        <MatchColumnItem
          v-for="item in chunk.meanings"
          :key="item.cardId"
          :text="item.meaning"
          :status="meaningStatus.get(item.cardId) ?? 'pending'"
          @click="selectMeaning(item.cardId)"
        />
      </div>
    </div>
  </div>
</template>
