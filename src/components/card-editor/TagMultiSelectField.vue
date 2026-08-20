<script setup lang="ts">
import { ref } from 'vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import { useTagStore } from '@/stores/tag-store';

const tagIds = defineModel<string[]>('tagIds', { required: true });

const tagStore = useTagStore();

const isCreating = ref(false);
const newTagName = ref('');
const newTagColor = ref('#6b7280');

function toggleTag(id: string) {
  tagIds.value = tagIds.value.includes(id)
    ? tagIds.value.filter((tagId) => tagId !== id)
    : [...tagIds.value, id];
}

async function createTag() {
  const name = newTagName.value.trim();
  if (!name) return;

  const tag = await tagStore.add({ name, color: newTagColor.value });
  tagIds.value = [...tagIds.value, tag.id];
  newTagName.value = '';
  isCreating.value = false;
}
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between">
      <span class="text-xs font-medium text-gray-600">Tags</span>
      <button
        type="button"
        class="text-xs font-medium text-black underline underline-offset-2 hover:no-underline"
        @click="isCreating = !isCreating"
      >
        + New tag
      </button>
    </div>

    <div class="flex flex-wrap gap-2">
      <BaseTag
        v-for="tag in tagStore.tags"
        :key="tag.id"
        :label="tag.name"
        :color="tag.color"
        selectable
        :selected="tagIds.includes(tag.id)"
        @click="toggleTag(tag.id)"
      />
      <p
        v-if="tagStore.tags.length === 0"
        class="text-xs text-gray-400"
      >
        No tags yet.
      </p>
    </div>

    <div
      v-if="isCreating"
      class="mt-2 flex items-center gap-2"
    >
      <input
        v-model="newTagColor"
        type="color"
        class="h-8 w-8 shrink-0 cursor-pointer rounded border border-gray-300"
      />
      <input
        v-model="newTagName"
        type="text"
        placeholder="Tag name"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
        @keyup.enter="createTag"
      />
      <button
        type="button"
        class="shrink-0 rounded bg-black px-3 py-2 text-xs font-medium text-white hover:bg-gray-800"
        @click="createTag"
      >
        Add
      </button>
    </div>
  </div>
</template>
