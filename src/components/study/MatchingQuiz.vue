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
/** The meaning briefly nudged by "Need a hint?" — purely a presentation overlay over 'pending',
 *  never written into `meaningStatus` itself, so it can't be mistaken for an actual match. */
const hintMeaningCardId = ref<string | null>(null);

const matchedCount = computed(
  () => [...wordStatus.value.values()].filter((status) => status === 'correct').length,
);
const progressPercent = computed(() => Math.round((matchedCount.value / props.chunk.words.length) * 100));

function wordStatusFor(cardId: string): ItemStatus | 'hint' {
  const status = wordStatus.value.get(cardId) ?? 'pending';
  // 'incorrect'/'correct' are the settled outcome of a just-made guess and must win over the
  // transient 'selected' highlight, so the word flashes red alongside its meaning on a miss.
  if (status !== 'pending') return status;
  return selectedWordId.value === cardId ? 'selected' : 'pending';
}

function meaningStatusFor(cardId: string): ItemStatus | 'hint' {
  const status = meaningStatus.value.get(cardId) ?? 'pending';
  if (status !== 'pending') return status;
  return hintMeaningCardId.value === cardId ? 'hint' : 'pending';
}

function selectWord(cardId: string) {
  if (isResolving.value || wordStatus.value.get(cardId) === 'correct') return;
  hintMeaningCardId.value = null;
  selectedWordId.value = selectedWordId.value === cardId ? null : cardId;
}

function selectMeaning(meaningCardId: string) {
  if (isResolving.value || !selectedWordId.value || meaningStatus.value.get(meaningCardId) === 'matched') return;

  const wordCardId = selectedWordId.value;
  const isCorrect = meaningCardId === wordCardId;

  hintMeaningCardId.value = null;
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

/** Briefly highlights the correct meaning for the currently selected word — the highlight is
 *  purely visual (see `hintMeaningCardId`) and never auto-completes the match. */
function requestHint() {
  if (!selectedWordId.value || isResolving.value) return;
  hintMeaningCardId.value = selectedWordId.value;
  window.setTimeout(() => {
    hintMeaningCardId.value = null;
  }, 1500);
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl">
    <p class="mb-1 text-center text-2xl font-bold text-text">Match the words</p>
    <p class="mb-4 text-center text-sm text-primary/80">Tap a word, then choose its matching meaning.</p>

    <div class="mx-auto mb-6 max-w-xs">
      <p class="mb-1.5 text-center text-sm text-text/70">
        <span class="font-semibold text-primary">{{ matchedCount }}</span> / {{ chunk.words.length }} matched
      </p>
      <div class="h-1.5 w-full overflow-hidden rounded-full bg-text/10">
        <div
          class="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3 sm:gap-4">
      <div class="rounded-2xl bg-card-surface p-3">
        <div class="mb-3 flex items-center gap-1.5 px-1">
          <AppIcon icon-name="Book1" :size="14" class="text-primary" />
          <span class="text-xs font-semibold tracking-wider text-primary">WORDS</span>
        </div>
        <div class="flex flex-col gap-2.5">
          <MatchColumnItem
            v-for="item in chunk.words"
            :key="item.cardId"
            :text="item.word"
            :status="wordStatusFor(item.cardId)"
            @click="selectWord(item.cardId)"
          />
        </div>
      </div>
      <div class="rounded-2xl bg-card-surface p-3">
        <div class="mb-3 flex items-center gap-1.5 px-1">
          <AppIcon icon-name="DocumentText" :size="14" class="text-primary" />
          <span class="text-xs font-semibold tracking-wider text-primary">MEANINGS</span>
        </div>
        <div class="flex flex-col gap-2.5">
          <MatchColumnItem
            v-for="item in chunk.meanings"
            :key="item.cardId"
            :text="item.meaning"
            :status="meaningStatusFor(item.cardId)"
            @click="selectMeaning(item.cardId)"
          />
        </div>
      </div>
    </div>

    <div class="mt-6 flex justify-center">
      <button
        type="button"
        class="rounded-full border border-slate-600/50 bg-card-surface/60 px-5 py-2.5 text-sm font-medium text-primary transition-colors duration-150 hover:bg-card-surface disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="!selectedWordId || isResolving"
        @click="requestHint"
      >
        💡 Need a hint?
      </button>
    </div>
  </div>
</template>
