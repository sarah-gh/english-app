<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import TopicFormModal from '@/components/browse/TopicFormModal.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import type { Deck } from '@/types/deck';
import type { Tag } from '@/types/tag';
import type { Topic } from '@/types/topic';

const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const topicStore = useTopicStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    tagStore.ensureLoaded(),
    topicStore.ensureLoaded(),
  ]);
  isReady.value = true;
});

function deckCardCount(deckId: string): number {
  return cardStore.byDeck(deckId).length;
}

function deckTopicCardCount(topicId: string): number {
  return cardStore.cards.filter((card) => card.topicId === topicId).length;
}

// --- Topics (nested under each deck) ---
const expandedDeckId = ref<string | null>(null);
const creatingTopicForDeckId = ref<string | null>(null);
const editingTopic = ref<Topic | null>(null);
const deletingTopic = ref<Topic | null>(null);

function toggleDeckTopics(deckId: string) {
  expandedDeckId.value = expandedDeckId.value === deckId ? null : deckId;
}

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

function tagCardCount(tagId: string): number {
  return cardStore.cards.filter((card) => card.tagIds.includes(tagId)).length;
}

// --- Deck rename/delete ---
const editingDeckId = ref<string | null>(null);
const deckNameDraft = ref('');
const deletingDeck = ref<Deck | null>(null);

function startEditDeck(deck: Deck) {
  editingDeckId.value = deck.id;
  deckNameDraft.value = deck.name;
}

async function saveDeckName() {
  const name = deckNameDraft.value.trim();
  if (name && editingDeckId.value) {
    await deckStore.edit(editingDeckId.value, { name });
  }
  editingDeckId.value = null;
}

async function confirmDeleteDeck() {
  if (deletingDeck.value) {
    await deckStore.remove(deletingDeck.value.id);
    deletingDeck.value = null;
  }
}

// --- Tag rename/recolor/delete ---
const editingTagId = ref<string | null>(null);
const tagNameDraft = ref('');
const tagColorDraft = ref('#6b7280');
const deletingTag = ref<Tag | null>(null);

function startEditTag(tag: Tag) {
  editingTagId.value = tag.id;
  tagNameDraft.value = tag.name;
  tagColorDraft.value = tag.color;
}

async function saveTag() {
  const name = tagNameDraft.value.trim();
  if (name && editingTagId.value) {
    await tagStore.edit(editingTagId.value, { name, color: tagColorDraft.value });
  }
  editingTagId.value = null;
}

async function confirmDeleteTag() {
  if (deletingTag.value) {
    await tagStore.remove(deletingTag.value.id);
    deletingTag.value = null;
  }
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6">
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
    <h1 class="mb-6 text-xl font-semibold text-text">Decks &amp; Tags</h1>

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>

    <template v-else>
      <section class="mb-8">
        <h2 class="mb-2 text-sm font-semibold text-text">Decks</h2>
        <ul class="divide-y divide-text/10 rounded-xl border border-text/10">
          <li
            v-for="deck in deckStore.decks"
            :key="deck.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3"
          >
            <template v-if="editingDeckId === deck.id">
              <input
                v-model="deckNameDraft"
                type="text"
                class="w-full rounded border border-text/20 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                @keyup.enter="saveDeckName"
              />
              <button
                type="button"
                class="shrink-0 text-xs font-medium text-primary underline underline-offset-2"
                @click="saveDeckName"
              >
                Save
              </button>
              <button
                type="button"
                class="shrink-0 text-xs text-text/50"
                @click="editingDeckId = null"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <span class="min-w-0 flex-1 truncate text-sm text-text">{{ deck.name }}</span>
              <span class="shrink-0 text-xs text-text/50">{{ deckCardCount(deck.id) }} cards</span>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1 rounded border border-text/20 px-2 py-1 text-xs text-text/60 hover:border-primary hover:text-primary"
                @click="toggleDeckTopics(deck.id)"
              >
                <AppIcon
                  icon-name="ArrowDown2"
                  :size="12"
                  class="transition-transform duration-200"
                  :class="{ 'rotate-180': expandedDeckId === deck.id }"
                />
                Topics
              </button>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1 rounded border border-text/20 px-2 py-1 text-xs text-text/60 hover:border-primary hover:text-primary"
                @click="startEditDeck(deck)"
              >
                <AppIcon
                  icon-name="Edit2"
                  :size="12"
                />
                Rename
              </button>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1 rounded border border-danger/30 px-2 py-1 text-xs text-danger hover:border-danger"
                @click="deletingDeck = deck"
              >
                <AppIcon
                  icon-name="Trash"
                  :size="12"
                />
                Delete
              </button>
            </template>
            <div
              v-if="expandedDeckId === deck.id"
              class="w-full border-t border-text/10 pt-3"
            >
              <ul class="mb-2 space-y-1.5">
                <li
                  v-for="topic in topicStore.byDeck(deck.id)"
                  :key="topic.id"
                  class="flex items-center gap-2 rounded border border-text/10 px-3 py-1.5"
                >
                  <span class="min-w-0 flex-1 truncate text-xs text-text">{{ topic.name }}</span>
                  <span class="shrink-0 text-[11px] text-text/50">{{ deckTopicCardCount(topic.id) }} cards</span>
                  <button
                    type="button"
                    aria-label="Rename topic"
                    class="shrink-0 rounded p-1 text-text/40 hover:text-primary"
                    @click="editingTopic = topic"
                  >
                    <AppIcon
                      icon-name="Edit2"
                      :size="12"
                    />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete topic"
                    class="shrink-0 rounded p-1 text-text/40 hover:text-danger"
                    @click="deletingTopic = topic"
                  >
                    <AppIcon
                      icon-name="Trash"
                      :size="12"
                    />
                  </button>
                </li>
                <li
                  v-if="topicStore.byDeck(deck.id).length === 0"
                  class="px-1 py-1 text-xs text-text/35"
                >
                  No topics yet.
                </li>
              </ul>
              <button
                type="button"
                class="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2"
                @click="creatingTopicForDeckId = deck.id"
              >
                <AppIcon
                  icon-name="Add"
                  :size="12"
                />
                Add Topic
              </button>
            </div>
          </li>
          <li
            v-if="deckStore.decks.length === 0"
            class="px-4 py-3 text-sm text-text/35"
          >
            No decks yet.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold text-text">Tags</h2>
        <ul class="divide-y divide-text/10 rounded-xl border border-text/10">
          <li
            v-for="tag in tagStore.tags"
            :key="tag.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <template v-if="editingTagId === tag.id">
              <input
                v-model="tagColorDraft"
                type="color"
                class="h-8 w-8 shrink-0 cursor-pointer rounded border border-text/20"
              />
              <input
                v-model="tagNameDraft"
                type="text"
                class="w-full rounded border border-text/20 px-2 py-1 text-sm focus:border-primary focus:outline-none"
                @keyup.enter="saveTag"
              />
              <button
                type="button"
                class="shrink-0 text-xs font-medium text-primary underline underline-offset-2"
                @click="saveTag"
              >
                Save
              </button>
              <button
                type="button"
                class="shrink-0 text-xs text-text/50"
                @click="editingTagId = null"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <span
                class="h-3 w-3 shrink-0 rounded-full"
                :style="{ backgroundColor: tag.color }"
              />
              <span class="min-w-0 flex-1 truncate text-sm text-text">{{ tag.name }}</span>
              <span class="shrink-0 text-xs text-text/50">{{ tagCardCount(tag.id) }} cards</span>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1 rounded border border-text/20 px-2 py-1 text-xs text-text/60 hover:border-primary hover:text-primary"
                @click="startEditTag(tag)"
              >
                <AppIcon
                  icon-name="Edit2"
                  :size="12"
                />
                Edit
              </button>
              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1 rounded border border-danger/30 px-2 py-1 text-xs text-danger hover:border-danger"
                @click="deletingTag = tag"
              >
                <AppIcon
                  icon-name="Trash"
                  :size="12"
                />
                Delete
              </button>
            </template>
          </li>
          <li
            v-if="tagStore.tags.length === 0"
            class="px-4 py-3 text-sm text-text/35"
          >
            No tags yet.
          </li>
        </ul>
      </section>
    </template>

    <ConfirmDialog
      v-if="deletingDeck"
      title="Delete this deck?"
      :message="`Deleting “${deletingDeck.name}” will also permanently delete its ${deckCardCount(deletingDeck.id)} card(s). This can't be undone.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDeleteDeck"
      @cancel="deletingDeck = null"
    />

    <ConfirmDialog
      v-if="deletingTag"
      title="Delete this tag?"
      :message="`Removing “${deletingTag.name}” will unlink it from ${tagCardCount(deletingTag.id)} card(s). The cards themselves won't be deleted.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDeleteTag"
      @cancel="deletingTag = null"
    />

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
      :message="`Deleting “${deletingTopic.name}” won't delete its ${deckTopicCardCount(deletingTopic.id)} card(s) — they'll move to Uncategorized.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDeleteTopic"
      @cancel="deletingTopic = null"
    />
  </div>
</template>
