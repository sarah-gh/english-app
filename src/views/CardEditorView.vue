<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import CardEditorForm from '@/components/card-editor/CardEditorForm.vue';
import {
  blankCardFormState,
  cardFormStateFromCard,
  cardFormStateToNewCard,
} from '@/components/card-editor/card-form-state';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';

const route = useRoute();
const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const topicStore = useTopicStore();
const settingsStore = useSettingsStore();

const cardId = route.params.id as string | undefined;
const isEditing = ref(false);
const isReady = ref(false);
const isSaving = ref(false);
const isDirty = ref(false);
const toastMessage = ref('');
const isConfirmingCancel = ref(false);
let editingCardId: string | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const draft = reactive(blankCardFormState());
const formRef = ref<InstanceType<typeof CardEditorForm> | null>(null);

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    tagStore.ensureLoaded(),
    topicStore.ensureLoaded(),
    settingsStore.ensureLoaded(),
  ]);

  const deckIdParam = route.query.deckId;
  const topicIdParam = route.query.topicId;
  if (typeof deckIdParam === 'string') draft.deckId = deckIdParam;
  if (typeof topicIdParam === 'string') draft.topicId = topicIdParam;

  if (cardId) {
    const existing = cardStore.getById(cardId);
    if (existing) {
      Object.assign(draft, cardFormStateFromCard(existing));
      isEditing.value = true;
      editingCardId = existing.id;
    }
  }
  isReady.value = true;

  // Wait for the load-time assignment above to settle before tracking edits, so restoring an
  // existing card's fields doesn't itself count as a user change.
  await nextTick();
  isDirty.value = false;
  watch(draft, () => {
    isDirty.value = true;
  }, { deep: true });
});

onBeforeUnmount(() => {
  if (toastTimer) clearTimeout(toastTimer);
});

function showToast(message: string) {
  toastMessage.value = message;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMessage.value = '';
  }, 3000);
}

async function handleSubmit(mode: 'add-another' | 'exit') {
  isSaving.value = true;
  try {
    const payload = cardFormStateToNewCard(draft);
    if (editingCardId) {
      await cardStore.edit(editingCardId, payload);
      router.push('/cards');
      return;
    }

    await cardStore.add(payload);
    if (mode === 'add-another') {
      const keepDeckId = draft.deckId;
      const keepTopicId = draft.topicId;
      Object.assign(draft, blankCardFormState());
      draft.deckId = keepDeckId;
      draft.topicId = keepTopicId;
      isDirty.value = false;
      formRef.value?.resetValidation();
      showToast('Card saved successfully!');
    } else {
      router.push('/cards');
    }
  } finally {
    isSaving.value = false;
  }
}

function handleCancel() {
  if (isDirty.value) {
    isConfirmingCancel.value = true;
    return;
  }
  router.back();
}

function confirmDiscardChanges() {
  isConfirmingCancel.value = false;
  router.back();
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6 pb-18.75">
    <h1 class="mb-2 text-lg font-semibold text-text">
      {{ isEditing ? 'Edit Card' : 'New Card' }}
    </h1>
    <p v-if="!isReady" class="text-sm text-text/50">
      Loading…
    </p>
    <CardEditorForm
v-else ref="formRef" v-model:draft="draft" :is-saving="isSaving" :is-editing="isEditing"
      @submit="handleSubmit" @cancel="handleCancel" />
    <Transition name="fade">
      <div
v-if="toastMessage"
        class="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded bg-primary px-4 py-2 text-sm font-medium text-background shadow-lg"
        role="status">
        {{ toastMessage }}
      </div>
    </Transition>

    <ConfirmDialog
v-if="isConfirmingCancel" title="Discard unsaved changes?"
      message="You have unsaved changes that will be lost." confirm-label="Discard" @confirm="confirmDiscardChanges"
      @cancel="isConfirmingCancel = false" />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
