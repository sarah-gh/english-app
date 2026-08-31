<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, watch } from 'vue';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import CardEditorForm from '@/components/card-editor/CardEditorForm.vue';
import { cardFormStateFromCard, cardFormStateToNewCard } from '@/components/card-editor/card-form-state';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import type { Card } from '@/types/card';

const props = defineProps<{ card: Card }>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();
const topicStore = useTopicStore();
const settingsStore = useSettingsStore();

const isSaving = ref(false);
const isDirty = ref(false);
const isConfirmingCancel = ref(false);

const draft = reactive(cardFormStateFromCard(props.card));
const formRef = ref<InstanceType<typeof CardEditorForm> | null>(null);

onMounted(async () => {
  await Promise.all([
    deckStore.ensureLoaded(),
    tagStore.ensureLoaded(),
    topicStore.ensureLoaded(),
    settingsStore.ensureLoaded(),
  ]);

  await nextTick();
  isDirty.value = false;
  watch(draft, () => {
    isDirty.value = true;
  }, { deep: true });
});

async function handleSubmit() {
  isSaving.value = true;
  try {
    const payload = cardFormStateToNewCard(draft);
    await cardStore.edit(props.card.id, payload);
    emit('saved');
  } finally {
    isSaving.value = false;
  }
}

function requestClose() {
  if (isDirty.value) {
    isConfirmingCancel.value = true;
    return;
  }
  emit('close');
}

function confirmDiscardChanges() {
  isConfirmingCancel.value = false;
  emit('close');
}
</script>

<template>
  <div class="fixed inset-0 z-50 overflow-y-auto bg-background">
    <div class="sticky top-0 z-10 flex items-center justify-between border-b border-text/10 bg-background px-4 py-3">
      <h1 class="text-lg font-semibold text-text">Edit Card</h1>
      <button
        type="button"
        aria-label="Close editor"
        class="flex h-9 w-9 items-center justify-center rounded-full text-text/60 hover:text-primary"
        @click="requestClose"
      >
        <AppIcon
          icon-name="CloseCircle"
          :size="20"
        />
      </button>
    </div>

    <div class="px-4 py-6">
      <CardEditorForm
        ref="formRef"
        v-model:draft="draft"
        :is-saving="isSaving"
        is-editing
        @submit="handleSubmit"
        @cancel="requestClose"
      />
    </div>

    <ConfirmDialog
      v-if="isConfirmingCancel"
      title="Discard unsaved changes?"
      message="You have unsaved changes that will be lost."
      confirm-label="Discard"
      @confirm="confirmDiscardChanges"
      @cancel="isConfirmingCancel = false"
    />
  </div>
</template>
