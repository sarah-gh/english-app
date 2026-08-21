<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import CardListItem from '@/components/card-management/CardListItem.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import type { ReviewStatus } from '@/types/card';
import type { CardViewMode } from '@/types/view-mode';

const route = useRoute();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();

const isReady = ref(false);
const searchQuery = ref('');
const selectedDeckId = ref('');
const selectedStatus = ref<ReviewStatus | ''>('');
const selectedTagIds = ref<string[]>([]);
const viewMode = ref<CardViewMode>('study');
/** Collapsed by default to keep this section short on mobile — auto-opened when a deck filter
 *  arrives via query param (e.g. from a Dashboard deck link) so the active filter isn't hidden. */
const isFiltersOpen = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), tagStore.ensureLoaded()]);
  const deckIdParam = route.query.deckId;
  if (typeof deckIdParam === 'string') selectedDeckId.value = deckIdParam;
  isFiltersOpen.value = Boolean(selectedDeckId.value);
  isReady.value = true;
});

function toggleTagFilter(id: string) {
  selectedTagIds.value = selectedTagIds.value.includes(id)
    ? selectedTagIds.value.filter((tagId) => tagId !== id)
    : [...selectedTagIds.value, id];
}

const activeFilterCount = computed(() => {
  let count = 0;
  if (searchQuery.value.trim()) count += 1;
  if (selectedDeckId.value) count += 1;
  if (selectedStatus.value) count += 1;
  return count + selectedTagIds.value.length;
});

const filteredCards = computed(() => {
  const query = searchQuery.value.trim().toLowerCase();
  return cardStore.cards
    .filter((card) => {
      if (selectedDeckId.value && card.deckId !== selectedDeckId.value) return false;
      if (selectedStatus.value && card.reviewStatus !== selectedStatus.value) return false;
      if (
        selectedTagIds.value.length > 0 &&
        !selectedTagIds.value.some((id) => card.tagIds.includes(id))
      ) {
        return false;
      }
      if (query) {
        const haystack = `${card.frontTitle} ${card.backAnswer} ${card.hint ?? ''}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
});
</script>

<template>
  <div class="min-h-screen bg-white px-4 pt-6 pb-3">
    <RouterLink
      to="/"
      class="mb-4 inline-block text-sm text-gray-500 hover:text-black"
    >
      ← Dashboard
    </RouterLink>

    <div class="mb-3 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-black">Cards</h1>
      <div class="flex items-center gap-2">
        <BaseButton
          variant="secondary"
          size="sm"
          to="/cards/import"
        >
          Import Excel
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          to="/cards/new"
        >
          + Add Card
        </BaseButton>
      </div>
    </div>

    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>

    <template v-else>
      <BaseSegmentedToggle
        v-model="viewMode"
        class="mb-2"
        size="sm"
        :options="[
          { value: 'study', label: 'Study' },
          { value: 'practice', label: 'Practice' },
        ]"
      />

      <button
        type="button"
        class="mb-3 flex w-full items-center justify-between rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-black hover:text-black"
        :aria-expanded="isFiltersOpen"
        @click="isFiltersOpen = !isFiltersOpen"
      >
        <span class="flex items-center gap-2">
          Search &amp; Filters
          <span
            v-if="activeFilterCount > 0"
            class="rounded-full bg-black px-1.5 py-0.5 text-[10px] font-semibold text-white"
          >
            {{ activeFilterCount }}
          </span>
        </span>
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
          class="shrink-0 transition-transform duration-200"
          :class="{ 'rotate-180': isFiltersOpen }"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        class="mb-3 grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out"
        :class="isFiltersOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
        :inert="!isFiltersOpen"
      >
        <div class="min-h-0 overflow-hidden">
          <BaseInput
            v-model="searchQuery"
            type="search"
            placeholder="Search title, answer, or hint…"
            class="mb-3"
          />

          <div class="mb-3 flex gap-2">
            <BaseSelect
              v-model="selectedDeckId"
              class="w-full"
            >
              <option value="">All decks</option>
              <option
                v-for="deck in deckStore.decks"
                :key="deck.id"
                :value="deck.id"
              >
                {{ deck.name }}
              </option>
            </BaseSelect>
            <BaseSelect
              v-model="selectedStatus"
              class="w-full"
            >
              <option value="">All statuses</option>
              <option value="new">New</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </BaseSelect>
          </div>

          <div
            v-if="tagStore.tags.length > 0"
            class="flex flex-wrap gap-2"
          >
            <BaseTag
              v-for="tag in tagStore.tags"
              :key="tag.id"
              :label="tag.name"
              :color="tag.color"
              selectable
              :selected="selectedTagIds.includes(tag.id)"
              @click="toggleTagFilter(tag.id)"
            />
          </div>
        </div>
      </div>

      <p class="mb-3 text-xs text-gray-500">
        {{ filteredCards.length }} card{{ filteredCards.length === 1 ? '' : 's' }}
      </p>

      <TransitionGroup
        tag="div"
        name="card-list"
        class="relative space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto"
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
        class="rounded-lg border border-gray-300 py-8 text-center text-sm text-gray-400"
      >
        No cards match these filters.
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
/* Takes the leaving card out of flow so the remaining cards can slide smoothly into its place
 * instead of snapping once it disappears. */
.card-list-leave-active {
  position: absolute;
  width: 100%;
}
</style>
