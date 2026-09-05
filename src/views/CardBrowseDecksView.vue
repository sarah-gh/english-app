<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import DeckTree from '@/components/browse/DeckTree.vue';
import TopicFormModal from '@/components/browse/TopicFormModal.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useBrowseTreeStore } from '@/stores/browse-tree-store';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTopicStore } from '@/stores/topic-store';
import type { Topic } from '@/types/topic';

const route = useRoute();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();
const browseTreeStore = useBrowseTreeStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), topicStore.ensureLoaded()]);
  isReady.value = true;

  // Arriving from a "deck" link elsewhere (e.g. the dashboard) expands and scrolls to that deck.
  const targetDeckId = route.query.deck;
  if (typeof targetDeckId === 'string' && deckStore.getById(targetDeckId)) {
    browseTreeStore.expand(targetDeckId);
    await nextTick();
    document.getElementById(`deck-${targetDeckId}`)?.scrollIntoView({ block: 'center' });
  }
});

function cardCountFor(deckId: string): number {
  return cardStore.byDeck(deckId).length;
}

function topicsFor(deckId: string): Topic[] {
  return topicStore.byDeck(deckId);
}

/** New cards always get assigned a topic (falling back to "General"), but a topic's count also
 *  folds in any leftover topic-less card from before that was guaranteed, so nothing is ever
 *  silently hidden from the deck tree. */
function cardCountForTopic(topicId: string): number {
  const count = cardStore.byTopic(topicId).length;
  const topic = topicStore.getById(topicId);
  if (!topic || !topicStore.isGeneral(topic)) return count;
  return count + cardStore.byDeck(topic.deckId).filter((card) => !card.topicId).length;
}

const creatingTopicForDeckId = ref<string | null>(null);
const editingTopic = ref<Topic | null>(null);
const deletingTopic = ref<Topic | null>(null);

async function saveTopic(values: { name: string; description?: string }) {
  if (editingTopic.value) {
    await topicStore.edit(editingTopic.value.id, values);
    editingTopic.value = null;
  } else if (creatingTopicForDeckId.value) {
    await topicStore.add({ deckId: creatingTopicForDeckId.value, ...values });
    creatingTopicForDeckId.value = null;
  }
}

async function confirmDeleteTopic() {
  if (deletingTopic.value) {
    await topicStore.remove(deletingTopic.value.id);
    deletingTopic.value = null;
  }
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 pt-6 pb-18.75">
    <RouterLink
      to="/"
      class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Dashboard
    </RouterLink>

    <div class="mb-4 flex items-center justify-between">
      <h1 class="font-serif text-2xl font-bold text-card-primary">Browse Cards</h1>
      <div class="flex items-center gap-2">
        <BaseButton
          variant="secondary"
          size="sm"
          to="/cards/import"
          aria-label="Import"
          class="bg-card-gold/90! text-background! hover:bg-card-gold! px-2.5!"
        >
          <AppIcon
            icon-name="DocumentUpload"
            :size="14"
          />
          <span class="hidden sm:inline">Import</span>
        </BaseButton>
        <BaseButton
          variant="primary"
          size="sm"
          to="/cards/new"
          aria-label="Add Card"
          class="px-2.5!"
        >
          <AppIcon
            icon-name="Add"
            :size="14"
          />
          <span class="hidden sm:inline">Add Card</span>
        </BaseButton>
      </div>
    </div>

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>
    <template v-else>
      <RouterLink
        to="/cards/all"
        class="mb-3 flex items-center gap-2 rounded-2xl border border-card-gold/20 bg-card-surface px-4 py-3 hover:border-card-gold/40"
      >
        <AppIcon
          icon-name="Category2"
          :size="16"
          class="shrink-0 text-card-gold/60"
        />
        <span class="min-w-0 flex-1 truncate text-base font-semibold text-card-gold">All Cards</span>
        <span class="hidden shrink-0 text-xs text-card-muted sm:inline">
          {{ cardStore.cards.length }} card{{ cardStore.cards.length === 1 ? '' : 's' }}
        </span>
        <AppIcon
          icon-name="ArrowRight2"
          :size="14"
          class="shrink-0 text-card-muted"
        />
      </RouterLink>

      <p class="mb-3 text-xs text-text/50">Expand a deck to browse its topics.</p>
      <DeckTree
        :decks="deckStore.decks"
        :card-count-for="cardCountFor"
        :topics-for="topicsFor"
        :card-count-for-topic="cardCountForTopic"
        @create-topic="creatingTopicForDeckId = $event"
        @edit-topic="editingTopic = $event"
        @delete-topic="deletingTopic = $event"
      />
      <p
        v-if="deckStore.decks.length === 0"
        class="rounded-lg border border-text/20 py-8 text-center text-sm text-text/35"
      >
        No decks yet. Create a card to get started.
      </p>
    </template>

    <TopicFormModal
      v-if="creatingTopicForDeckId || editingTopic"
      :topic="editingTopic"
      @save="saveTopic"
      @cancel="
        creatingTopicForDeckId = null;
        editingTopic = null;
      "
    />

    <ConfirmDialog
      v-if="deletingTopic"
      title="Delete this topic?"
      :message="`Deleting “${deletingTopic.name}” won't delete its ${cardCountForTopic(deletingTopic.id)} card(s) — they'll move to General.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDeleteTopic"
      @cancel="deletingTopic = null"
    />
  </div>
</template>
