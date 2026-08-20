<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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

const route = useRoute();
const router = useRouter();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const settingsStore = useSettingsStore();

const cardId = route.params.id as string | undefined;
const isEditing = ref(false);
const isReady = ref(false);
const isSaving = ref(false);
const isDirty = ref(false);
const toastMessage = ref('');
let editingCardId: string | undefined;
let toastTimer: ReturnType<typeof setTimeout> | undefined;

const draft = reactive(blankCardFormState());
const formRef = ref<InstanceType<typeof CardEditorForm> | null>(null);

onMounted(async () => {
  await Promise.all([
    cardStore.ensureLoaded(),
    deckStore.ensureLoaded(),
    tagStore.ensureLoaded(),
    settingsStore.ensureLoaded(),
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
      Object.assign(draft, blankCardFormState());
      draft.deckId = keepDeckId;
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
  if (isDirty.value && !window.confirm('Discard unsaved changes?')) return;
  router.back();
}
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-6">
    <h1 class="mb-2 text-lg font-semibold text-black">
      {{ isEditing ? 'Edit Card' : 'New Card' }}
    </h1>
    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>
    <CardEditorForm
      v-else
      ref="formRef"
      v-model:draft="draft"
      :is-saving="isSaving"
      :is-editing="isEditing"
      @submit="handleSubmit"
      @cancel="handleCancel"
    />
    <Transition name="fade">
      <div
        v-if="toastMessage"
        class="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded bg-black px-4 py-2 text-sm font-medium text-white shadow-lg"
        role="status"
      >
        {{ toastMessage }}
      </div>
    </Transition>
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
