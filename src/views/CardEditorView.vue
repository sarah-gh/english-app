<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import DuplicateCardWarningModal from '@/components/card/DuplicateCardWarningModal.vue';
import CardEditorForm from '@/components/card-editor/CardEditorForm.vue';
import {
  blankCardFormState,
  cardFormStateFromCard,
  cardFormStateToNewCard,
} from '@/components/card-editor/card-form-state';
import { useDuplicateCardCheck } from '@/composables/useDuplicateCardCheck';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import type { NewCard } from '@/types/card';
import type { DuplicateConflictItem, DuplicateResolutionAction } from '@/types/duplicate-card';

const route = useRoute();
const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const topicStore = useTopicStore();
const settingsStore = useSettingsStore();
const { findDuplicate, describeSavedCard, describeNewCard } = useDuplicateCardCheck();

const cardId = route.params.id as string | undefined;
const isEditing = ref(false);
const isReady = ref(false);
const isSaving = ref(false);
const isDirty = ref(false);
const toastMessage = ref('');
const isConfirmingCancel = ref(false);
const duplicateConflict = ref<DuplicateConflictItem | null>(null);
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

/** The save the user asked for, held back while the duplicate warning is on screen. */
let pendingSave: { payload: NewCard; mode: 'add-another' | 'exit'; duplicateId: string } | null =
  null;

async function handleSubmit(mode: 'add-another' | 'exit') {
  const payload = cardFormStateToNewCard(draft);

  // Every save goes through the app-wide exact-title check first, whether the fields were typed
  // by hand or filled in by AI Auto-Fill.
  const duplicate = await findDuplicate(payload.frontTitle, editingCardId);
  if (duplicate) {
    pendingSave = { payload, mode, duplicateId: duplicate.id };
    duplicateConflict.value = {
      key: 0,
      matchLabel: 'Already in your library',
      // Replacing is only offered when adding a new card. Doing it while editing a *different*
      // card would fold two saved cards into one, a deletion the user never asked for.
      canOverwrite: !editingCardId,
      existing: describeSavedCard(duplicate),
      incoming: describeNewCard(payload),
    };
    return;
  }

  await savePayload(payload, mode);
}

async function handleDuplicateResolution(action: DuplicateResolutionAction) {
  const pending = pendingSave;
  duplicateConflict.value = null;
  pendingSave = null;
  if (!pending || action === 'skip') return;

  await savePayload(pending.payload, pending.mode, action === 'overwrite' ? pending.duplicateId : undefined);
}

function cancelDuplicateResolution() {
  duplicateConflict.value = null;
  pendingSave = null;
}

async function savePayload(
  payload: NewCard,
  mode: 'add-another' | 'exit',
  overwriteCardId?: string,
) {
  isSaving.value = true;
  try {
    if (editingCardId) {
      await cardStore.edit(editingCardId, payload);
      router.push('/cards');
      return;
    }

    if (overwriteCardId) await cardStore.edit(overwriteCardId, payload);
    else await cardStore.add(payload);

    if (mode === 'add-another') {
      const keepDeckId = draft.deckId;
      const keepTopicId = draft.topicId;
      Object.assign(draft, blankCardFormState());
      draft.deckId = keepDeckId;
      draft.topicId = keepTopicId;
      isDirty.value = false;
      formRef.value?.resetValidation();
      showToast(overwriteCardId ? 'Existing card replaced!' : 'Card saved successfully!');
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
  <div class="min-h-screen bg-background px-4 py-6">
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

    <DuplicateCardWarningModal
      v-if="duplicateConflict"
      :conflict="duplicateConflict"
      :is-saving="isSaving"
      @resolve="handleDuplicateResolution"
      @cancel="cancelDuplicateResolution"
    />
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
