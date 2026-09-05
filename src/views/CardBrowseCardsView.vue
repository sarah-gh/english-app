<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import CardListItem from '@/components/card-management/CardListItem.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTopicStore } from '@/stores/topic-store';
import type { CardViewMode } from '@/types/view-mode';

const route = useRoute();
const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();

const deckId = computed(() => route.params.deckId as string);
/** A real topic id, or the pseudo-values 'all' (every card in the deck) / 'uncategorized'
 *  (cards with no topic assigned). */
const topicParam = computed(() => route.params.topicId as string);

const isReady = ref(false);
const searchQuery = ref('');
const viewMode = ref<CardViewMode>('study');

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), topicStore.ensureLoaded()]);
  isReady.value = true;
  if (!deckStore.getById(deckId.value)) router.replace('/cards');
});

const deck = computed(() => deckStore.getById(deckId.value));
const topic = computed(() =>
  topicParam.value === 'all' || topicParam.value === 'uncategorized'
    ? null
    : topicStore.getById(topicParam.value),
);

const pageTitle = computed(() => {
  if (topicParam.value === 'all') return 'All Cards';
  if (topicParam.value === 'uncategorized') return 'General';
  return topic.value?.name ?? 'Topic';
});

const scopedCards = computed(() =>
  cardStore.byDeck(deckId.value).filter((card) => {
    if (topicParam.value === 'all') return true;
    if (topicParam.value === 'uncategorized') return !card.topicId;
    return card.topicId === topicParam.value;
  }),
);

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  if (!query) return scopedCards.value;
  return scopedCards.value.filter((card) => {
    const haystack = `${card.frontTitle} ${card.backAnswer} ${card.hint ?? ''}`.toLowerCase();
    return haystack.includes(query);
  });
});

const addCardLink = computed(() => {
  const params = new URLSearchParams({ deckId: deckId.value });
  if (topicParam.value !== 'all' && topicParam.value !== 'uncategorized') {
    params.set('topicId', topicParam.value);
  }
  return `/cards/new?${params.toString()}`;
});
</script>

<template>
  <div class="min-h-screen bg-background px-4 pt-6 pb-3">
    <RouterLink
      :to="`/cards/${deckId}`"
      class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      {{ deck?.name ?? 'Topics' }}
    </RouterLink>

    <div class="mb-3 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-text">{{ pageTitle }}</h1>
      <BaseButton
        variant="primary"
        size="sm"
        :to="addCardLink"
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

      <p class="mb-3 text-xs text-text/50">
        {{ filteredCards.length }} card{{ filteredCards.length === 1 ? '' : 's' }}
      </p>

      <TransitionGroup
        tag="div"
        name="card-list"
        class="relative space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto"
      >
        <CardListItem
          v-for="card in filteredCards"
          :key="card.id"
          :card="card"
          :view-mode="viewMode"
        />
      </TransitionGroup>
      <p
        v-if="filteredCards.length === 0"
        class="rounded-lg border border-text/20 py-8 text-center text-sm text-text/35"
      >
        No cards here yet.
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
