<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ActiveFiltersBar from '@/components/browse/ActiveFiltersBar.vue';
import AllCardsFilterBar from '@/components/browse/AllCardsFilterBar.vue';
import CardListItem from '@/components/card-management/CardListItem.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import type { DifficultyFilter, PosFilter, SortOption, StudyStatusFilter } from '@/types/card-filters';
import type { CardViewMode } from '@/types/view-mode';

const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
const tagStore = useTagStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    topicStore.ensureLoaded(),
    tagStore.ensureLoaded(),
  ]);
  isReady.value = true;
});

const searchQuery = ref('');
const deckId = ref('');
const topicId = ref('');
const tagIds = ref<string[]>([]);
const studyStatus = ref<StudyStatusFilter>('all');
const difficulty = ref<DifficultyFilter>('all');
const pos = ref<PosFilter>('all');
const sort = ref<SortOption>('created-desc');
const viewMode = ref<CardViewMode>('study');

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return cardStore.cards.filter((card) => {
    if (deckId.value && card.deckId !== deckId.value) return false;
    if (topicId.value && card.topicId !== topicId.value) return false;
    if (tagIds.value.length > 0 && !tagIds.value.some((id) => card.tagIds.includes(id))) return false;
    if (studyStatus.value === 'studied' && card.studyCount === 0) return false;
    if (studyStatus.value === 'unstudied' && card.studyCount > 0) return false;
    if (difficulty.value !== 'all' && card.reviewStatus !== difficulty.value) return false;
    if (pos.value !== 'all' && !card.partsOfSpeech?.some((entry) => entry.pos === pos.value)) return false;
    if (query) {
      const haystack = `${card.frontTitle} ${card.backAnswer} ${card.hint ?? ''}`.toLowerCase();
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
      return list.sort((a, b) => (b.reviewStats.lastReviewedAt ?? 0) - (a.reviewStats.lastReviewedAt ?? 0));
    case 'created-desc':
    default:
      return list.sort((a, b) => b.createdAt - a.createdAt);
  }
});

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
  if (searchQuery.value.trim()) chips.push({ key: 'search', label: `Search: "${searchQuery.value.trim()}"` });
  if (deckId.value) chips.push({ key: 'deck', label: deckStore.getById(deckId.value)?.name ?? 'Deck' });
  if (topicId.value) chips.push({ key: 'topic', label: topicStore.getById(topicId.value)?.name ?? 'Topic' });
  for (const id of tagIds.value) {
    const tag = tagStore.getById(id);
    if (tag) chips.push({ key: `tag:${id}`, label: tag.name });
  }
  if (studyStatus.value !== 'all') chips.push({ key: 'studyStatus', label: STUDY_STATUS_LABELS[studyStatus.value] });
  if (difficulty.value !== 'all') chips.push({ key: 'difficulty', label: DIFFICULTY_LABELS[difficulty.value] });
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
  <div class="min-h-screen bg-background px-4 pt-6 pb-18.75">
    <RouterLink
      to="/cards"
      class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Browse Cards
    </RouterLink>

    <div class="mb-4 flex items-center justify-between">
      <h1 class="font-serif text-2xl font-bold text-card-primary">All Cards</h1>
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
      class="text-sm text-text/50"
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

      <p class="mb-3 text-xs text-text/50">
        Showing {{ sortedCards.length }} of {{ cardStore.cards.length }} card{{
          cardStore.cards.length === 1 ? '' : 's'
        }}
      </p>

      <TransitionGroup
        tag="div"
        name="card-list"
        class="relative space-y-3"
      >
        <CardListItem
          v-for="card in sortedCards"
          :key="card.id"
          :card="card"
          :view-mode="viewMode"
        />
      </TransitionGroup>
      <p
        v-if="sortedCards.length === 0"
        class="rounded-lg border border-text/20 py-8 text-center text-sm text-text/35"
      >
        No cards match the active filters.
      </p>
    </template>
  </div>
</template>

<style scoped>
.card-list-move,
.card-list-enter-active,
.card-list-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}
.card-list-enter-from {
  opacity: 0;
  transform: translateY(-8px);
}
.card-list-leave-to {
  opacity: 0;
  transform: scale(0.96);
}
.card-list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
