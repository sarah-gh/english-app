<script setup lang="ts">
import type { Deck } from '@/types/deck';
import { useBrowseTreeStore } from '@/stores/browse-tree-store';
import type { Topic } from '@/types/topic';
import DeckTreeItem from './DeckTreeItem.vue';

defineProps<{
  decks: Deck[];
  cardCountFor: (deckId: string) => number;
  topicsFor: (deckId: string) => Topic[];
  cardCountForTopic: (topicId: string) => number;
  uncategorizedCountFor: (deckId: string) => number;
}>();

defineEmits<{
  createTopic: [deckId: string];
  editTopic: [topic: Topic];
  deleteTopic: [topic: Topic];
}>();

const browseTreeStore = useBrowseTreeStore();
</script>

<template>
  <div class="space-y-2">
    <DeckTreeItem
      v-for="deck in decks"
      :id="`deck-${deck.id}`"
      :key="deck.id"
      :deck-id="deck.id"
      :name="deck.name"
      :card-count="cardCountFor(deck.id)"
      :topics="topicsFor(deck.id)"
      :card-count-for-topic="cardCountForTopic"
      :uncategorized-count="uncategorizedCountFor(deck.id)"
      :expanded="browseTreeStore.isExpanded(deck.id)"
      @toggle="browseTreeStore.toggle(deck.id)"
      @create-topic="$emit('createTopic', deck.id)"
      @edit-topic="$emit('editTopic', $event)"
      @delete-topic="$emit('deleteTopic', $event)"
    />
  </div>
</template>
