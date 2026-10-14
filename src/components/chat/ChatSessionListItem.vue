<script setup lang="ts">
import { nextTick, ref } from 'vue';
import type { ChatSession } from '@/types/chat-message';
import { formatRelativeTime } from '@/utils/date';

const props = defineProps<{ session: ChatSession; active: boolean }>();
const emit = defineEmits<{
  select: [];
  rename: [title: string];
  delete: [];
}>();

const isRenaming = ref(false);
const draftTitle = ref('');
const input = ref<HTMLInputElement | null>(null);

async function startRename() {
  draftTitle.value = props.session.title;
  isRenaming.value = true;
  await nextTick();
  input.value?.select();
}

function commitRename() {
  if (!isRenaming.value) return;
  isRenaming.value = false;
  if (draftTitle.value.trim()) emit('rename', draftTitle.value);
}
</script>

<template>
  <li
    class="group flex items-center gap-1 rounded-xl pr-1 transition-colors"
    :class="active ? 'bg-primary/15' : 'hover:bg-text/5'"
  >
    <form
      v-if="isRenaming"
      class="flex-1 px-2 py-2"
      @submit.prevent="commitRename"
    >
      <label
        :for="`rename-${session.id}`"
        class="sr-only"
      >Chat title</label>
      <input
        :id="`rename-${session.id}`"
        ref="input"
        v-model="draftTitle"
        maxlength="80"
        class="w-full rounded-md border border-primary/40 bg-transparent px-2 py-1 text-sm text-text focus:outline-none"
        @blur="commitRename"
        @keydown.esc.prevent="isRenaming = false"
      />
    </form>
    <button
      v-else
      type="button"
      class="min-w-0 flex-1 px-3 py-2.5 text-left"
      :aria-current="active ? 'true' : undefined"
      @click="emit('select')"
    >
      <span class="flex items-baseline justify-between gap-2">
        <span
          class="truncate text-sm font-medium"
          :class="active ? 'text-primary' : 'text-text'"
        >{{ session.title }}</span>
        <span class="shrink-0 text-[10px] text-text/40">{{ formatRelativeTime(session.updatedAt) }}</span>
      </span>
      <span
        v-if="session.lastMessagePreview"
        class="mt-0.5 block truncate text-xs text-text/50"
      >{{ session.lastMessagePreview }}</span>
    </button>
    <template v-if="!isRenaming">
      <button
        type="button"
        :aria-label="`Rename ${session.title}`"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text/40 transition-colors hover:bg-text/10 hover:text-text"
        @click="startRename"
      >
        <AppIcon
          icon-name="Edit2"
          :size="15"
        />
      </button>
      <button
        type="button"
        :aria-label="`Delete ${session.title}`"
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-text/40 transition-colors hover:bg-danger/10 hover:text-danger"
        @click="emit('delete')"
      >
        <AppIcon
          icon-name="Trash"
          :size="15"
        />
      </button>
    </template>
  </li>
</template>
