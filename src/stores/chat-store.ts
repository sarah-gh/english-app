import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { chatMessageRepository, chatSessionRepository } from '@/db/repositories';
import { AiServiceError } from '@/services/ai/errors';
import { getTutorReply } from '@/services/ai/tutor-chat-service';
import { useSettingsStore } from '@/stores/settings-store';
import { useSyncStore } from '@/stores/sync-store';
import {
  DEFAULT_CHAT_SESSION_TITLE,
  type ChatMessage,
  type ChatSession,
} from '@/types/chat-message';
import { previewFromMessage, titleFromMessage } from '@/utils/chat-session';

/** Per-device convenience only (which thread was open last), never synced. */
const ACTIVE_SESSION_STORAGE_KEY = 'flashcards:ai-tutor:active-session';

function readStoredActiveSessionId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredActiveSessionId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, id);
    else localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.), reopening on the newest thread is fine.
  }
}

export const useChatStore = defineStore('chat', () => {
  /** Live sessions, most recently active first. */
  const sessions = ref<ChatSession[]>([]);
  /** `null` is a fresh, unsaved "New chat": its session row is only created on the first send, so
   *  opening and abandoning New Chat never leaves empty threads behind. */
  const activeSessionId = ref<string | null>(null);
  /** The active session's live messages, oldest-first. */
  const messages = ref<ChatMessage[]>([]);
  const isLoaded = ref(false);
  /** The session a reply is currently being fetched for, one request at a time across threads. */
  const sendingSessionId = ref<string | null>(null);
  const error = ref<{ sessionId: string; message: string } | null>(null);

  const activeSession = computed(
    () => sessions.value.find((session) => session.id === activeSessionId.value) ?? null,
  );
  const isSending = computed(() => sendingSessionId.value !== null);
  const isActiveSessionSending = computed(
    () => sendingSessionId.value !== null && sendingSessionId.value === activeSessionId.value,
  );
  const activeError = computed(() =>
    error.value && error.value.sessionId === activeSessionId.value ? error.value.message : '',
  );

  function setActiveSessionId(id: string | null): void {
    activeSessionId.value = id;
    writeStoredActiveSessionId(id);
  }

  async function loadActiveMessages(): Promise<void> {
    const id = activeSessionId.value;
    const loaded = id ? await chatMessageRepository.getBySession(id) : [];
    // A quick switch while this was loading must not show the previous thread's messages.
    if (activeSessionId.value === id) messages.value = loaded;
  }

  /** Also called by the sync store after a sync, which may have added, renamed, or deleted
   *  threads behind this store's back. */
  async function fetchAll(): Promise<void> {
    sessions.value = await chatSessionRepository.getAll();
    const isFirstLoad = !isLoaded.value;
    const preferred = isFirstLoad ? readStoredActiveSessionId() : activeSessionId.value;
    if (preferred && sessions.value.some((session) => session.id === preferred)) {
      setActiveSessionId(preferred);
    } else if (isFirstLoad || preferred !== null) {
      // First open, or the open thread was deleted on another device: show the newest thread.
      // Otherwise `null` is a deliberate unsaved "New chat" and is kept as-is.
      setActiveSessionId(sessions.value[0]?.id ?? null);
    }
    await loadActiveMessages();
    isLoaded.value = true;
  }

  async function ensureLoaded(): Promise<void> {
    if (!isLoaded.value) await fetchAll();
  }

  async function selectSession(id: string): Promise<void> {
    if (id === activeSessionId.value) return;
    setActiveSessionId(id);
    messages.value = [];
    await loadActiveMessages();
  }

  function startNewChat(): void {
    setActiveSessionId(null);
    messages.value = [];
  }

  /** Re-sorts the in-memory list after a session's `updatedAt` changed. */
  function upsertSession(session: ChatSession): void {
    sessions.value = [session, ...sessions.value.filter((item) => item.id !== session.id)].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );
  }

  /** Persists a new message and rolls its session's preview/`updatedAt` forward. */
  async function appendMessage(sessionId: string, message: ChatMessage): Promise<void> {
    const session = sessions.value.find((item) => item.id === sessionId);
    if (!session) return;
    const changes: Partial<ChatSession> = { lastMessagePreview: previewFromMessage(message) };
    // The first user message names the thread, unless the user has already renamed it.
    if (
      message.role === 'user' &&
      session.titleUpdatedAt === null &&
      session.title === DEFAULT_CHAT_SESSION_TITLE
    ) {
      changes.title = titleFromMessage(message.content);
    }
    await chatSessionRepository.update(sessionId, changes, message.timestamp);
    upsertSession({ ...session, ...changes, updatedAt: message.timestamp });
    if (activeSessionId.value === sessionId) messages.value.push(message);
  }

  /** Asks the tutor to answer one session's conversation as stored (which must end on a user
   *  message). On failure the user's message stays put so `retry` can resend it. */
  async function requestReply(sessionId: string): Promise<void> {
    sendingSessionId.value = sessionId;
    error.value = null;
    try {
      const settingsStore = useSettingsStore();
      await settingsStore.ensureLoaded();
      const conversation = await chatMessageRepository.getBySession(sessionId);
      const reply = await getTutorReply(settingsStore.settings, conversation);
      // The thread may have been deleted while the reply was in flight.
      if (!sessions.value.some((session) => session.id === sessionId)) return;
      const saved = await chatMessageRepository.create({
        sessionId,
        role: 'assistant',
        content: reply,
      });
      await appendMessage(sessionId, saved);
    } catch (caught) {
      error.value = {
        sessionId,
        message:
          caught instanceof AiServiceError
            ? caught.message
            : 'The tutor could not reply right now. Please try again.',
      };
    } finally {
      sendingSessionId.value = null;
    }
  }

  async function send(content: string): Promise<void> {
    const trimmed = content.trim();
    if (!trimmed || isSending.value) return;
    await ensureLoaded();

    let sessionId = activeSessionId.value;
    if (!sessionId) {
      const created = await chatSessionRepository.create();
      upsertSession(created);
      setActiveSessionId(created.id);
      sessionId = created.id;
    }

    const saved = await chatMessageRepository.create({ sessionId, role: 'user', content: trimmed });
    await appendMessage(sessionId, saved);
    await requestReply(sessionId);
  }

  /** Resends the active conversation after a failed reply, only while it ends on the user. */
  async function retry(): Promise<void> {
    const sessionId = activeSessionId.value;
    if (!sessionId || isSending.value || messages.value.at(-1)?.role !== 'user') return;
    await requestReply(sessionId);
  }

  async function renameSession(id: string, title: string): Promise<void> {
    const trimmed = title.trim().replace(/\s+/g, ' ');
    const session = sessions.value.find((item) => item.id === id);
    if (!trimmed || !session || trimmed === session.title) return;
    const timestamp = Date.now();
    await chatSessionRepository.update(
      id,
      { title: trimmed, titleUpdatedAt: timestamp },
      timestamp,
    );
    upsertSession({ ...session, title: trimmed, titleUpdatedAt: timestamp, updatedAt: timestamp });
    void useSyncStore().syncNow();
  }

  async function deleteSession(id: string): Promise<void> {
    const timestamp = Date.now();
    await Promise.all([
      chatSessionRepository.softDelete(id, timestamp),
      chatMessageRepository.softDeleteBySessions([id], timestamp),
    ]);
    sessions.value = sessions.value.filter((session) => session.id !== id);
    if (error.value?.sessionId === id) error.value = null;
    if (activeSessionId.value === id) {
      setActiveSessionId(sessions.value[0]?.id ?? null);
      messages.value = [];
      await loadActiveMessages();
    }
    // Pushed right away (fire-and-forget, non-interactive, same as a saved quiz result) so another
    // device doesn't keep showing a thread the user deliberately deleted.
    void useSyncStore().syncNow();
  }

  return {
    sessions,
    activeSessionId,
    activeSession,
    messages,
    isLoaded,
    isSending,
    isActiveSessionSending,
    activeError,
    fetchAll,
    ensureLoaded,
    selectSession,
    startNewChat,
    send,
    retry,
    renameSession,
    deleteSession,
  };
});
