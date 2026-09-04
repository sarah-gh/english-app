<script setup lang="ts">
import { computed, ref } from 'vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import { useTagStore } from '@/stores/tag-store';

const tagIds = defineModel<string[]>('tagIds', { required: true });

const tagStore = useTagStore();

/** Starts open whenever the card already has tags (editing an existing card), collapsed for a
 *  brand-new card with none yet — mirrors `QuizTagFilter`'s collapsed-by-default panel without
 *  hiding tags a card already has. */
const isExpanded = ref(tagIds.value.length > 0);
const isCreating = ref(false);
const newTagName = ref('');
const newTagColor = ref('#6b7280');

const summaryLabel = computed(() =>
  tagIds.value.length === 0 ? 'Tags' : `Tags (${tagIds.value.length} selected)`,
);

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
    <button
      type="button"
      class="flex w-full items-center justify-between rounded border border-card-gold/20 bg-card-surface px-3 py-2 text-left text-sm font-medium text-text hover:border-card-gold/40"
      :aria-expanded="isExpanded"
      @click="isExpanded = !isExpanded"
    >
      <span>{{ summaryLabel }}</span>
      <AppIcon
        icon-name="ArrowDown2"
        :size="16"
        class="shrink-0 text-card-gold transition-transform duration-150"
        :class="isExpanded ? 'rotate-180' : ''"
      />
    </button>

    <div
      v-if="isExpanded"
      class="mt-2 rounded-lg border border-card-gold/10 bg-card-definition p-3"
    >
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
          class="text-xs text-text/35"
        >
          No tags yet.
        </p>
      </div>

      <div class="mt-3 border-t border-card-gold/10 pt-3">
        <button
          v-if="!isCreating"
          type="button"
          class="inline-flex items-center gap-1 text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
          @click="isCreating = true"
        >
          <AppIcon
            icon-name="Add"
            :size="12"
          />
          New tag
        </button>
        <div
          v-else
          class="flex items-center gap-2"
        >
          <input
            v-model="newTagColor"
            type="color"
            class="h-8 w-8 shrink-0 cursor-pointer rounded border border-text/20"
          />
          <input
            v-model="newTagName"
            type="text"
            placeholder="Tag name"
            class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            @keyup.enter="createTag"
          />
          <button
            type="button"
            class="shrink-0 rounded bg-primary px-3 py-2 text-xs font-medium text-background hover:bg-primary/90"
            @click="createTag"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
