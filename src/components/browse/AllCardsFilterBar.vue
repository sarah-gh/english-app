<script setup lang="ts">
import { computed } from 'vue';
import TagFilterDropdown from '@/components/browse/TagFilterDropdown.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useTopicStore } from '@/stores/topic-store';
import type { DifficultyFilter, PosFilter, SortOption, StudyStatusFilter } from '@/types/card-filters';
import type { Deck } from '@/types/deck';
import type { Tag } from '@/types/tag';

const props = defineProps<{
  decks: Deck[];
  tags: Tag[];
}>();

const deckId = defineModel<string>('deckId', { required: true });
const topicId = defineModel<string>('topicId', { required: true });
const tagIds = defineModel<string[]>('tagIds', { required: true });
const studyStatus = defineModel<StudyStatusFilter>('studyStatus', { required: true });
const difficulty = defineModel<DifficultyFilter>('difficulty', { required: true });
const pos = defineModel<PosFilter>('pos', { required: true });
const sort = defineModel<SortOption>('sort', { required: true });

const topicStore = useTopicStore();

const deckOptions = computed(() => [
  { value: '', label: 'All decks' },
  ...props.decks.map((deck) => ({ value: deck.id, label: deck.name })),
]);

const topicOptions = computed(() => [
  { value: '', label: 'All topics' },
  ...(deckId.value ? topicStore.byDeck(deckId.value) : []).map((topic) => ({ value: topic.id, label: topic.name })),
]);

function onDeckChange(value: string) {
  deckId.value = value;
  if (!topicStore.byDeck(value).some((topic) => topic.id === topicId.value)) {
    topicId.value = '';
  }
}

const STUDY_STATUS_OPTIONS: { value: StudyStatusFilter; label: string }[] = [
  { value: 'all', label: 'All Statuses' },
  { value: 'studied', label: 'Studied' },
  { value: 'unstudied', label: 'Unstudied' },
];

const DIFFICULTY_OPTIONS: { value: DifficultyFilter; label: string }[] = [
  { value: 'all', label: 'All Difficulties' },
  { value: 'new', label: 'New' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const POS_OPTIONS: { value: PosFilter; label: string }[] = [
  { value: 'all', label: 'All Parts of Speech' },
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'other', label: 'Other' },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'created-desc', label: 'Recently Created' },
  { value: 'last-reviewed', label: 'Last Reviewed' },
  { value: 'alphabetical', label: 'Alphabetical' },
  { value: 'study-count', label: 'Study Count' },
];
</script>

<template>
  <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
    <BaseSelect
      :model-value="deckId"
      :options="deckOptions"
      @update:model-value="onDeckChange"
    />
    <BaseSelect
      v-model="topicId"
      :disabled="!deckId"
      :options="topicOptions"
    />
    <TagFilterDropdown
      v-model="tagIds"
      :tags="tags"
    />
    <BaseSelect
      v-model="studyStatus"
      :options="STUDY_STATUS_OPTIONS"
    />
    <BaseSelect
      v-model="difficulty"
      :options="DIFFICULTY_OPTIONS"
    />
    <BaseSelect
      v-model="pos"
      :options="POS_OPTIONS"
    />
    <BaseSelect
      v-model="sort"
      class="col-span-2 sm:col-span-1"
      :options="SORT_OPTIONS"
    />
  </div>
</template>
