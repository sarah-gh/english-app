<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import type { Deck } from '@/types/deck';
import type { Tag } from '@/types/tag';

const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();

const isReady = ref(false);

onMounted(async () => {
  await Promise.all([cardStore.ensureLoaded(), deckStore.ensureLoaded(), tagStore.ensureLoaded()]);
  isReady.value = true;
});

function deckCardCount(deckId: string): number {
  return cardStore.byDeck(deckId).length;
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
  <div class="min-h-screen bg-white px-4 py-6">
    <RouterLink
      to="/"
      class="mb-4 inline-block text-sm text-gray-500 hover:text-black"
    >
      ← Dashboard
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-black">Decks &amp; Tags</h1>

    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>

    <template v-else>
      <section class="mb-8">
        <h2 class="mb-2 text-sm font-semibold text-black">Decks</h2>
        <ul class="divide-y divide-gray-200 rounded-lg border border-gray-300">
          <li
            v-for="deck in deckStore.decks"
            :key="deck.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <template v-if="editingDeckId === deck.id">
              <input
                v-model="deckNameDraft"
                type="text"
                class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-black focus:outline-none"
                @keyup.enter="saveDeckName"
              />
              <button
                type="button"
                class="shrink-0 text-xs font-medium text-black underline underline-offset-2"
                @click="saveDeckName"
              >
                Save
              </button>
              <button
                type="button"
                class="shrink-0 text-xs text-gray-500"
                @click="editingDeckId = null"
              >
                Cancel
              </button>
            </template>
            <template v-else>
              <span class="min-w-0 flex-1 truncate text-sm text-black">{{ deck.name }}</span>
              <span class="shrink-0 text-xs text-gray-500">{{ deckCardCount(deck.id) }} cards</span>
              <button
                type="button"
                class="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-black hover:text-black"
                @click="startEditDeck(deck)"
              >
                Rename
              </button>
              <button
                type="button"
                class="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-black hover:text-black"
                @click="deletingDeck = deck"
              >
                Delete
              </button>
            </template>
          </li>
          <li
            v-if="deckStore.decks.length === 0"
            class="px-4 py-3 text-sm text-gray-400"
          >
            No decks yet.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold text-black">Tags</h2>
        <ul class="divide-y divide-gray-200 rounded-lg border border-gray-300">
          <li
            v-for="tag in tagStore.tags"
            :key="tag.id"
            class="flex items-center gap-3 px-4 py-3"
          >
            <template v-if="editingTagId === tag.id">
              <input
                v-model="tagColorDraft"
                type="color"
                class="h-8 w-8 shrink-0 cursor-pointer rounded border border-gray-300"
              />
              <input
                v-model="tagNameDraft"
                type="text"
                class="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-black focus:outline-none"
                @keyup.enter="saveTag"
              />
              <button
                type="button"
                class="shrink-0 text-xs font-medium text-black underline underline-offset-2"
                @click="saveTag"
              >
                Save
              </button>
              <button
                type="button"
                class="shrink-0 text-xs text-gray-500"
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
              <span class="min-w-0 flex-1 truncate text-sm text-black">{{ tag.name }}</span>
              <span class="shrink-0 text-xs text-gray-500">{{ tagCardCount(tag.id) }} cards</span>
              <button
                type="button"
                class="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:border-black hover:text-black"
                @click="startEditTag(tag)"
              >
                Edit
              </button>
              <button
                type="button"
                class="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-500 hover:border-black hover:text-black"
                @click="deletingTag = tag"
              >
                Delete
              </button>
            </template>
          </li>
          <li
            v-if="tagStore.tags.length === 0"
            class="px-4 py-3 text-sm text-gray-400"
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
      @confirm="confirmDeleteDeck"
      @cancel="deletingDeck = null"
    />

    <ConfirmDialog
      v-if="deletingTag"
      title="Delete this tag?"
      :message="`Removing “${deletingTag.name}” will unlink it from ${tagCardCount(deletingTag.id)} card(s). The cards themselves won't be deleted.`"
      confirm-label="Delete"
      @confirm="confirmDeleteTag"
      @cancel="deletingTag = null"
    />
  </div>
</template>
