<script setup lang="ts">
import { watchDebounced } from '@vueuse/core';
import { computed, onMounted, ref, shallowRef } from 'vue';
import ActiveFiltersBar from '@/components/browse/ActiveFiltersBar.vue';
import AllCardsFilterBar from '@/components/browse/AllCardsFilterBar.vue';
import CardListSkeleton from '@/components/browse/CardListSkeleton.vue';
import CardVirtualList from '@/components/browse/CardVirtualList.vue';
import PageHeaderBack from '@/components/common/PageHeaderBack.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useCardFilterQuerySync } from '@/composables/useCardFilterQuerySync';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import type { Card } from '@/types/card';
import type { DifficultyFilter, PosFilter, StudyStatusFilter } from '@/types/card-filters';
import { stripHtmlToText } from '@/utils/html';

const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
const tagStore = useTagStore();

const isReady = ref(false);

// Seeded from `route.query` on setup and mirrored back to it on change, so filters survive a
// trip to the card editor and back (see the composable's doc comment for why).
const {
  searchQuery,
  deckId,
  topicId,
  tagIds,
  studyStatus,
  difficulty,
  pos,
  sort,
  viewMode,
  syncQueryParams,
} = useCardFilterQuerySync();

/** Filtering/sorting 1,000+ cards synchronously inside a `computed` is heavy enough to jank a
 *  keystroke or a filter toggle, so it instead runs here, off the reactive graph: `scheduleRecompute`
 *  flips `isFiltering` on straight away (so the loading state can paint), then defers the actual
 *  work a frame so the browser isn't asked to filter, sort, and re-render in the same tick. */
const displayedCards = shallowRef<Card[]>([]);
const isFiltering = ref(false);
let recomputeToken = 0;

function filterAndSortCards(): Card[] {
  const query = searchQuery.value.trim().toLowerCase();
  const filtered = cardStore.cards.filter((card) => {
    if (deckId.value && card.deckId !== deckId.value) return false;
    if (topicId.value && card.topicId !== topicId.value) return false;
    if (tagIds.value.length > 0 && !tagIds.value.some((id) => card.tagIds.includes(id)))
      return false;
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

  switch (sort.value) {
    case 'alphabetical':
      return filtered.sort((a, b) => a.frontTitle.localeCompare(b.frontTitle));
    case 'study-count':
      return filtered.sort((a, b) => b.studyCount - a.studyCount);
    case 'last-reviewed':
      return filtered.sort(
        (a, b) => (b.reviewStats.lastReviewedAt ?? 0) - (a.reviewStats.lastReviewedAt ?? 0),
      );
    case 'created-desc':
    default:
      return filtered.sort((a, b) => b.createdAt - a.createdAt);
  }
}

function scheduleRecompute() {
  isFiltering.value = true;
  const token = ++recomputeToken;
  // One frame to let `isFiltering`'s loading state paint, then a macrotask so the actual filter
  // work runs in its own tick instead of blocking the frame that shows the loading state.
  requestAnimationFrame(() => {
    setTimeout(() => {
      if (token !== recomputeToken) return; // a newer input/filter change superseded this run
      displayedCards.value = filterAndSortCards();
      isFiltering.value = false;
    }, 0);
  });
}

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    topicStore.ensureLoaded(),
    tagStore.ensureLoaded(),
  ]);
  isReady.value = true;
  scheduleRecompute();
});

watchDebounced(
  [searchQuery, deckId, topicId, tagIds, studyStatus, difficulty, pos, sort, () => cardStore.cards],
  scheduleRecompute,
  { debounce: 200 },
);

watchDebounced(
  [searchQuery, deckId, topicId, tagIds, studyStatus, difficulty, pos, sort, viewMode],
  syncQueryParams,
  { debounce: 200 },
);

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
  if (deckId.value)
    chips.push({ key: 'deck', label: deckStore.getById(deckId.value)?.name ?? 'Deck' });
  if (topicId.value)
    chips.push({ key: 'topic', label: topicStore.getById(topicId.value)?.name ?? 'Topic' });
  for (const id of tagIds.value) {
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
    deckId.value = '';
    topicId.value = '';
  } else if (key === 'topic') topicId.value = '';
  else if (key.startsWith('tag:')) tagIds.value = tagIds.value.filter((id) => id !== key.slice(4));
  else if (key === 'studyStatus') studyStatus.value = 'all';
  else if (key === 'difficulty') difficulty.value = 'all';
  else if (key === 'pos') pos.value = 'all';
}

function clearAllFilters() {
  searchQuery.value = '';
  deckId.value = '';
  topicId.value = '';
  tagIds.value = [];
  studyStatus.value = 'all';
  difficulty.value = 'all';
  pos.value = 'all';
}
</script>

<template>
  <div class="bg-background min-h-screen px-4 pt-6 pb-18.75">
    <PageHeaderBack
      to="/cards"
      label="Browse Cards"
    />

    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-card-primary font-serif text-2xl font-bold">All Cards</h1>
      <BaseButton
        variant="primary"
        size="sm"
        to="/cards/new"
      >
        <AppIcon
          icon-name="Add"
          :size="14"
        />
        Add Card
      </BaseButton>
    </div>

    <p
      v-if="!isReady"
      class="text-text/50 text-sm"
    >
      Loading…
    </p>

    <template v-else>
      <BaseSegmentedToggle
        v-model="viewMode"
        class="mb-3"
        size="sm"
        :options="[
          { value: 'study', label: 'Study' },
          { value: 'practice', label: 'Practice', color: 'secondary' },
        ]"
      />

      <BaseInput
        v-model="searchQuery"
        type="search"
        icon="SearchNormal1"
        placeholder="Search title, answer, or hint…"
        class="mb-3"
      />

      <AllCardsFilterBar
        v-model:deck-id="deckId"
        v-model:topic-id="topicId"
        v-model:tag-ids="tagIds"
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

      <p class="text-text/50 mb-3 flex items-center gap-2 text-xs">
        Showing {{ displayedCards.length }} of {{ cardStore.cards.length }} card{{
          cardStore.cards.length === 1 ? '' : 's'
        }}
        <span
          v-if="isFiltering"
          class="text-primary"
        >
          · Filtering…
        </span>
      </p>

      <CardListSkeleton v-if="isFiltering && displayedCards.length === 0" />
      <CardVirtualList
        v-else-if="displayedCards.length > 0"
        :cards="displayedCards"
        :view-mode="viewMode"
        class="transition-opacity duration-150"
        :class="{ 'pointer-events-none opacity-50': isFiltering }"
      />
      <p
        v-if="!isFiltering && displayedCards.length === 0"
        class="border-text/20 text-text/35 rounded-lg border py-8 text-center text-sm"
      >
        No cards match the active filters.
      </p>
    </template>
  </div>
</template>
