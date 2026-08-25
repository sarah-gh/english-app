<script setup lang="ts">
import type { Topic } from '@/types/topic';
import TopicGridItem from './TopicGridItem.vue';

defineProps<{
  deckId: string;
  topics: Topic[];
  cardCountFor: (topicId: string) => number;
  allCardsCount: number;
  uncategorizedCount: number;
}>();

defineEmits<{
  create: [];
  edit: [topic: Topic];
  delete: [topic: Topic];
}>();
</script>

<template>
  <div class="grid grid-cols-2 gap-3">
    <TopicGridItem
      name="All Cards"
      :card-count="allCardsCount"
      :to="`/cards/${deckId}/all`"
    />
    <TopicGridItem
      v-for="topic in topics"
      :key="topic.id"
      :name="topic.name"
      :card-count="cardCountFor(topic.id)"
      :to="`/cards/${deckId}/${topic.id}`"
      editable
      @edit="$emit('edit', topic)"
      @delete="$emit('delete', topic)"
    />
    <TopicGridItem
      v-if="uncategorizedCount > 0"
      name="Uncategorized"
      :card-count="uncategorizedCount"
      :to="`/cards/${deckId}/uncategorized`"
    />
    <button
      type="button"
      class="flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-text/20 p-4 text-text/50 hover:border-primary hover:text-primary"
      @click="$emit('create')"
    >
      <AppIcon
        icon-name="Add"
        :size="18"
      />
      <span class="text-xs font-medium">Add Topic</span>
    </button>
  </div>
</template>
