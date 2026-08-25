<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import TopicFormModal from '@/components/browse/TopicFormModal.vue';
import TopicGrid from '@/components/browse/TopicGrid.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTopicStore } from '@/stores/topic-store';
import type { Topic } from '@/types/topic';

const route = useRoute();
const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const topicStore = useTopicStore();

const deckId = computed(() => route.params.deckId as string);
const isReady = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), topicStore.ensureLoaded()]);
  isReady.value = true;
  if (!deckStore.getById(deckId.value)) router.replace('/cards');
});

const deck = computed(() => deckStore.getById(deckId.value));
const topics = computed(() => topicStore.byDeck(deckId.value));
const deckCards = computed(() => cardStore.byDeck(deckId.value));
const uncategorizedCount = computed(() => deckCards.value.filter((card) => !card.topicId).length);

function cardCountFor(topicId: string): number {
  return deckCards.value.filter((card) => card.topicId === topicId).length;
}

const isCreatingTopic = ref(false);
const editingTopic = ref<Topic | null>(null);
const deletingTopic = ref<Topic | null>(null);

async function saveTopic(values: { name: string; description?: string }) {
  if (editingTopic.value) {
    await topicStore.edit(editingTopic.value.id, values);
    editingTopic.value = null;
  } else {
    await topicStore.add({ deckId: deckId.value, ...values });
    isCreatingTopic.value = false;
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
      to="/cards"
      class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Decks
    </RouterLink>

    <div class="mb-4 flex items-center justify-between">
      <h1 class="text-xl font-semibold text-text">{{ deck?.name ?? 'Deck' }}</h1>
      <BaseButton
        variant="primary"
        size="sm"
        :to="`/cards/new?deckId=${deckId}`"
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
      <p class="mb-3 text-xs text-text/50">Choose a topic, or browse every card in this deck.</p>
      <TopicGrid
        :deck-id="deckId"
        :topics="topics"
        :card-count-for="cardCountFor"
        :all-cards-count="deckCards.length"
        :uncategorized-count="uncategorizedCount"
        @create="isCreatingTopic = true"
        @edit="editingTopic = $event"
        @delete="deletingTopic = $event"
      />
    </template>

    <TopicFormModal
      v-if="isCreatingTopic || editingTopic"
      :topic="editingTopic"
      @save="saveTopic"
      @cancel="
        isCreatingTopic = false;
        editingTopic = null;
      "
    />

    <ConfirmDialog
      v-if="deletingTopic"
      title="Delete this topic?"
      :message="`Deleting “${deletingTopic.name}” won't delete its ${cardCountFor(deletingTopic.id)} card(s) — they'll move to Uncategorized.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDeleteTopic"
      @cancel="deletingTopic = null"
    />
  </div>
</template>
