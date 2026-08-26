<script setup lang="ts">
import { RouterLink } from 'vue-router';
import type { Topic } from '@/types/topic';
import TopicTreeItem from './TopicTreeItem.vue';

defineProps<{
  deckId: string;
  name: string;
  cardCount: number;
  topics: Topic[];
  cardCountForTopic: (topicId: string) => number;
  uncategorizedCount: number;
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
  <div class="rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80">
    <div
      class="flex cursor-pointer items-center gap-2 px-3 py-3"
      @click="$emit('toggle')"
    >
      <button
        type="button"
        aria-label="Toggle topics"
        class="shrink-0 rounded p-0.5 text-text/40 hover:text-primary"
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
        class="shrink-0 text-text/30"
      />
      <span class="min-w-0 flex-1 truncate text-sm font-medium text-text">{{ name }}</span>
      <span class="shrink-0 text-xs text-text/50">
        {{ topics.length }} topic{{ topics.length === 1 ? '' : 's' }} · {{ cardCount }} card{{
          cardCount === 1 ? '' : 's'
        }}
      </span>
      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1 rounded border border-text/15 px-2 py-1 text-xs text-text/60 hover:border-primary hover:text-primary"
        @click.stop="$emit('createTopic')"
      >
        <AppIcon
          icon-name="Add"
          :size="12"
        />
        Add Topic
      </button>
    </div>

    <div
      class="grid transition-[grid-template-rows] duration-200 ease-out"
      :style="{ gridTemplateRows: expanded ? '1fr' : '0fr' }"
    >
      <div class="overflow-hidden">
        <div class="border-t border-text/10 px-3 py-2 transition-opacity duration-150" :class="expanded ? 'opacity-100' : 'opacity-0'">
          <div class="ml-2 space-y-0.5 border-l border-text/10 pl-2">
            <RouterLink
              :to="`/cards/${deckId}/all`"
              class="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium text-text hover:bg-primary/5"
            >
              <AppIcon
                icon-name="Folder2"
                :size="14"
                class="shrink-0 text-text/30"
              />
              All Cards in this Deck
              <span class="ml-auto shrink-0 text-xs font-normal text-text/40">{{ cardCount }}</span>
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

            <TopicTreeItem
              v-if="uncategorizedCount > 0"
              name="Uncategorized"
              :card-count="uncategorizedCount"
              :to="`/cards/${deckId}/uncategorized`"
            />

            <p
              v-if="topics.length === 0"
              class="px-2.5 py-1.5 text-xs text-text/35"
            >
              No topics yet.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
