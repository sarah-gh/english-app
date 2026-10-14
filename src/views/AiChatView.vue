<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import ChatComposer from '@/components/chat/ChatComposer.vue';
import ChatEmptyState from '@/components/chat/ChatEmptyState.vue';
import ChatHeader from '@/components/chat/ChatHeader.vue';
import ChatMessageBubble from '@/components/chat/ChatMessageBubble.vue';
import ChatQuickActions, { type ChatQuickAction } from '@/components/chat/ChatQuickActions.vue';
import ChatSessionDrawer from '@/components/chat/ChatSessionDrawer.vue';
import ChatTypingIndicator from '@/components/chat/ChatTypingIndicator.vue';
import GlassPanel from '@/components/chat/GlassPanel.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { hasRequiredAiCredentials } from '@/services/ai/with-provider-fallback';
import { useCardStore } from '@/stores/card-store';
import { useChatStore } from '@/stores/chat-store';
import { useSettingsStore } from '@/stores/settings-store';
import { DEFAULT_CHAT_SESSION_TITLE, type ChatSession } from '@/types/chat-message';

const chatStore = useChatStore();
const cardStore = useCardStore();
const settingsStore = useSettingsStore();

const isReady = ref(false);
const draft = ref('');
const isDrawerOpen = ref(false);
const sessionPendingDelete = ref<ChatSession | null>(null);
const composer = ref<InstanceType<typeof ChatComposer> | null>(null);

onMounted(async () => {
  await Promise.all([
    chatStore.ensureLoaded(),
    cardStore.ensureLoaded(),
    settingsStore.ensureLoaded(),
  ]);
  isReady.value = true;
  scrollToBottom('instant');
});

const hasApiKey = computed(() => hasRequiredAiCredentials(settingsStore.settings));
const title = computed(() => chatStore.activeSession?.title ?? DEFAULT_CHAT_SESSION_TITLE);
const canRetry = computed(
  () => Boolean(chatStore.activeError) && chatStore.messages.at(-1)?.role === 'user',
);

/** The page itself scrolls (not an inner pane), so the fixed composer and bottom nav float over
 *  the conversation with the frosted glass showing it through. */
function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
  void nextTick(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior }));
}

watch(
  () => [chatStore.messages.length, chatStore.isActiveSessionSending, chatStore.activeError],
  () => scrollToBottom(),
);
watch(
  () => chatStore.activeSessionId,
  () => scrollToBottom('instant'),
);

async function handleSubmit(content: string) {
  draft.value = '';
  await chatStore.send(content);
}

function handleQuickAction(action: ChatQuickAction) {
  if (action.mode === 'send') {
    void chatStore.send(action.prompt);
    return;
  }
  draft.value = action.prompt;
  void nextTick(() => composer.value?.focus());
}

function handleNewChat() {
  isDrawerOpen.value = false;
  draft.value = '';
  chatStore.startNewChat();
  void nextTick(() => composer.value?.focus());
}

async function handleSelectSession(id: string) {
  isDrawerOpen.value = false;
  draft.value = '';
  await chatStore.selectSession(id);
}

async function confirmDelete() {
  const session = sessionPendingDelete.value;
  sessionPendingDelete.value = null;
  if (session) await chatStore.deleteSession(session.id);
}
</script>

<template>
  <div class="min-h-screen bg-background px-4 pb-48">
    <ChatHeader
      :title="title"
      :saved-item-count="cardStore.cards.length"
      @open-sessions="isDrawerOpen = true"
      @new-chat="handleNewChat"
    />

    <ChatQuickActions
      class="mb-4"
      :disabled="!isReady || !hasApiKey || chatStore.isSending"
      @select="handleQuickAction"
    />

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>

    <template v-else>
      <GlassPanel
        v-if="!hasApiKey"
        class="mb-4 rounded-2xl px-4 py-3 text-sm text-text/70"
      >
        Add an AI provider API key in Settings to start chatting with your tutor.
        <BaseButton
          variant="link"
          size="sm"
          to="/settings"
          class="mt-1"
        >
          Open Settings
        </BaseButton>
      </GlassPanel>

      <ChatEmptyState
        v-if="chatStore.messages.length === 0 && !chatStore.isActiveSessionSending"
        :saved-item-count="cardStore.cards.length"
      />

      <div
        v-else
        class="flex flex-col gap-3"
        aria-live="polite"
      >
        <ChatMessageBubble
          v-for="message in chatStore.messages"
          :key="message.id"
          :message="message"
        />
        <ChatTypingIndicator v-if="chatStore.isActiveSessionSending" />
      </div>

      <div
        v-if="chatStore.activeError"
        class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-danger"
      >
        <span class="flex items-center gap-1.5">
          <WarningIcon />
          {{ chatStore.activeError }}
        </span>
        <BaseButton
          v-if="canRetry"
          variant="link"
          size="sm"
          @click="chatStore.retry()"
        >
          Retry
        </BaseButton>
      </div>
    </template>

    <div class="fixed inset-x-0 bottom-20 z-30 mx-auto max-w-lg px-4">
      <ChatComposer
        ref="composer"
        v-model="draft"
        :disabled="!isReady || !hasApiKey"
        :sending="chatStore.isSending"
        @submit="handleSubmit"
      />
    </div>

    <ChatSessionDrawer
      :open="isDrawerOpen"
      :sessions="chatStore.sessions"
      :active-session-id="chatStore.activeSessionId"
      @close="isDrawerOpen = false"
      @new-chat="handleNewChat"
      @select="handleSelectSession"
      @rename="chatStore.renameSession"
      @delete="(session) => (sessionPendingDelete = session)"
    />

    <!-- Teleported after the drawer so it stacks above it when deleting from the chat list. -->
    <Teleport to="body">
      <ConfirmDialog
        v-if="sessionPendingDelete"
        title="Delete this chat?"
        :message="`“${sessionPendingDelete.title}” and all of its messages will be permanently deleted on this device and, if Cloud Sync is on, on your other devices too.`"
        confirm-label="Delete Chat"
        variant="danger"
        @confirm="confirmDelete"
        @cancel="sessionPendingDelete = null"
      />
    </Teleport>
  </div>
</template>
