<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import CardEditorForm from '@/components/card-editor/CardEditorForm.vue';
import {
  blankCardFormState,
  cardFormStateFromCard,
  cardFormStateToNewCard,
} from '@/components/card-editor/card-form-state';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';

const route = useRoute();
const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();

const cardId = route.params.id as string | undefined;
const isEditing = ref(false);
const isReady = ref(false);
const isSaving = ref(false);
const saveMessage = ref('');
let editingCardId: string | undefined;

const draft = reactive(blankCardFormState());

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    tagStore.ensureLoaded(),
  ]);

  if (cardId) {
    const existing = cardStore.getById(cardId);
    if (existing) {
      Object.assign(draft, cardFormStateFromCard(existing));
      isEditing.value = true;
      editingCardId = existing.id;
    }
  }
  isReady.value = true;
});

async function handleSubmit() {
  isSaving.value = true;
  saveMessage.value = '';
  try {
    const payload = cardFormStateToNewCard(draft);
    if (editingCardId) {
      await cardStore.edit(editingCardId, payload);
      saveMessage.value = 'Card updated.';
    } else {
      await cardStore.add(payload);
      saveMessage.value = 'Card saved. Add another below.';
      Object.assign(draft, blankCardFormState());
    }
  } finally {
    isSaving.value = false;
  }
}

function handleCancel() {
  router.back();
}
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-6">
    <h1 class="mb-2 text-lg font-semibold text-black">
      {{ isEditing ? 'Edit Card' : 'New Card' }}
    </h1>
    <p
      v-if="saveMessage"
      class="mb-4 text-sm font-medium text-gray-700"
    >
      {{ saveMessage }}
    </p>
    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>
    <CardEditorForm
      v-else
      v-model:draft="draft"
      :is-saving="isSaving"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
  </div>
</template>
