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

function cardCountForTopic(topicId: string): number {
  return cardStore.byTopic(topicId).length;
}

function uncategorizedCountFor(deckId: string): number {
  return cardStore.byDeck(deckId).filter((card) => !card.topicId).length;
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
  <div class="min-h-screen bg-background px-4 pt-6 pb-3">
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
          class="bg-card-gold/90! text-background! hover:bg-card-gold!"
        >
          <AppIcon
            icon-name="DocumentUpload"
            :size="14"
          />
          Import
        </BaseButton>
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
    </div>

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>
    <template v-else>
      <p class="mb-3 text-xs text-text/50">Expand a deck to browse its topics.</p>
      <DeckTree
        :decks="deckStore.decks"
        :card-count-for="cardCountFor"
        :topics-for="topicsFor"
        :card-count-for-topic="cardCountForTopic"
        :uncategorized-count-for="uncategorizedCountFor"
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
      :message="`Deleting “${deletingTopic.name}” won't delete its ${cardCountForTopic(deletingTopic.id)} card(s) — they'll move to Uncategorized.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDeleteTopic"
      @cancel="deletingTopic = null"
    />
  </div>
</template>
