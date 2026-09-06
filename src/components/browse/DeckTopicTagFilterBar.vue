<script setup lang="ts">
import { computed } from 'vue';
import TagFilterDropdown from '@/components/browse/TagFilterDropdown.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { useTopicStore } from '@/stores/topic-store';
import type { Deck } from '@/types/deck';
import type { Tag } from '@/types/tag';

const props = defineProps<{
  decks: Deck[];
  tags: Tag[];
}>();

const deckId = defineModel<string>('deckId', { required: true });
const topicId = defineModel<string>('topicId', { required: true });
const tagIds = defineModel<string[]>('tagIds', { required: true });

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
</script>

<template>
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
</template>
