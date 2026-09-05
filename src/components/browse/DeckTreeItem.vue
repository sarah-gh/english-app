<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { Topic } from '@/types/topic';
import BaseCountBadge from '@/components/ui/BaseCountBadge.vue';
import TopicTreeItem from './TopicTreeItem.vue';

defineProps<{
  deckId: string;
  name: string;
  cardCount: number;
  topics: Topic[];
  cardCountForTopic: (topicId: string) => number;
  expanded: boolean;
}>();

defineEmits<{
  toggle: [];
  createTopic: [];
  editTopic: [topic: Topic];
  deleteTopic: [topic: Topic];
}>();
</script>

<template>
  <div class="rounded-2xl border border-card-gold/20 bg-card-surface">
    <div
      class="flex cursor-pointer items-center gap-2 px-4 py-3"
      @click="$emit('toggle')"
    >
      <button
        type="button"
        aria-label="Toggle topics"
        class="shrink-0 rounded p-0.5 text-card-muted hover:text-primary"
      >
        <AppIcon
          icon-name="ArrowRight2"
          :size="14"
          class="transition-transform duration-200"
          :class="{ 'rotate-90': expanded }"
        />
      </button>
      <AppIcon
        icon-name="Folder2"
        :size="16"
        class="shrink-0 text-card-gold/60"
      />
      <span class="min-w-0 flex-1 truncate text-base font-semibold text-card-gold">{{
        name
      }}</span>
      <span class="hidden shrink-0 text-xs text-card-muted sm:inline">
        {{ topics.length }} topic{{ topics.length === 1 ? '' : 's' }} · {{ cardCount }} card{{
          cardCount === 1 ? '' : 's'
        }}
      </span>
      <button
        type="button"
        aria-label="Add topic"
        class="inline-flex shrink-0 items-center gap-1 rounded-full bg-card-gold p-1.5 text-xs font-medium text-background hover:bg-card-gold/90 sm:px-3 sm:py-1.5"
        @click.stop="$emit('createTopic')"
      >
        <AppIcon
          icon-name="Add"
          :size="12"
        />
        <span class="hidden sm:inline">Add Topic</span>
      </button>
    </div>

    <div
      class="grid transition-[grid-template-rows] duration-200 ease-out"
      :style="{ gridTemplateRows: expanded ? '1fr' : '0fr' }"
    >
      <div class="overflow-hidden">
        <div
          class="border-t border-card-gold/10 px-3 pt-3 pb-3 transition-opacity duration-150"
          :class="expanded ? 'opacity-100' : 'opacity-0'"
        >
          <div class="space-y-0.5 rounded-lg bg-card-definition p-2">
            <RouterLink
              :to="`/cards/${deckId}/all`"
              class="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-text hover:bg-card-surface"
            >
              <AppIcon
                icon-name="Folder2"
                :size="14"
                class="shrink-0 text-card-muted"
              />
              All Cards in this Deck
              <BaseCountBadge
                :count="cardCount"
                class="ml-auto"
              />
            </RouterLink>

            <TopicTreeItem
              v-for="topic in topics"
              :key="topic.id"
              :name="topic.name"
              :card-count="cardCountForTopic(topic.id)"
              :to="`/cards/${deckId}/${topic.id}`"
              editable
              @edit="$emit('editTopic', topic)"
              @delete="$emit('deleteTopic', topic)"
            />

            <p
              v-if="topics.length === 0"
              class="px-2.5 py-1.5 text-xs text-card-muted"
            >
              No topics yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
