<script setup lang="ts">
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue';
import { computed, ref, useTemplateRef } from 'vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import { useTagStore } from '@/stores/tag-store';

const tagIds = defineModel<string[]>('tagIds', { required: true });

const tagStore = useTagStore();

const triggerRef = useTemplateRef<InstanceType<typeof PopoverButton>>('trigger');
const panelRef = useTemplateRef<InstanceType<typeof PopoverPanel>>('panel');

// Same bounded-popover setup as the browse-page TagFilterDropdown (offset/flip/shift/size), so
// this list is never clipped by the viewport or the form's own edges either, regardless of where
// in the (long, scrollable) card editor form it happens to be opened from.
const { floatingStyles } = useFloating(triggerRef, panelRef, {
  placement: 'bottom-start',
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(4),
    flip({ padding: 8 }),
    shift({ padding: 8 }),
    size({
      padding: 8,
      apply({ elements, availableWidth, availableHeight }) {
        elements.floating.style.minWidth = '14rem';
        elements.floating.style.maxWidth = `${Math.min(350, availableWidth)}px`;
        elements.floating.style.maxHeight = `${Math.min(320, availableHeight)}px`;
      },
    }),
  ],
});

const summaryLabel = computed(() =>
  tagIds.value.length === 0 ? 'Tags' : `Tags (${tagIds.value.length} selected)`,
);

const searchQuery = ref('');
const newTagColor = ref('#6b7280');

const trimmedQuery = computed(() => searchQuery.value.trim());
const filteredTags = computed(() => {
  const query = trimmedQuery.value.toLowerCase();
  if (!query) return tagStore.tags;
  return tagStore.tags.filter((tag) => tag.name.toLowerCase().includes(query));
});
/** Hides the "Create" suggestion once the typed name already belongs to a real tag, so the same
 *  name can't be created twice just because of a difference in case. */
const hasExactMatch = computed(() =>
  tagStore.tags.some((tag) => tag.name.toLowerCase() === trimmedQuery.value.toLowerCase()),
);
const showCreateOption = computed(() => trimmedQuery.value.length > 0 && !hasExactMatch.value);

function toggleTag(id: string) {
  tagIds.value = tagIds.value.includes(id)
    ? tagIds.value.filter((tagId) => tagId !== id)
    : [...tagIds.value, id];
}

async function createTagFromSearch() {
  const name = trimmedQuery.value;
  if (!name) return;
  const tag = await tagStore.add({ name, color: newTagColor.value });
  tagIds.value = [...tagIds.value, tag.id];
  searchQuery.value = '';
}
</script>

<template>
  <Popover>
    <PopoverButton
      ref="trigger"
      v-slot="{ open }"
      class="border-card-gold/20 bg-card-surface hover:border-card-gold/40 text-text flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm font-medium"
    >
      <span>{{ summaryLabel }}</span>
      <AppIcon
        icon-name="ArrowDown2"
        :size="16"
        class="text-card-gold shrink-0 transition-transform duration-150"
        :class="open ? 'rotate-180' : ''"
      />
    </PopoverButton>

    <transition
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <PopoverPanel
        ref="panel"
        :style="floatingStyles"
        class="border-card-gold/20 bg-card-surface z-50 flex w-88 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border shadow-lg"
      >
        <div class="border-card-gold/10 shrink-0 border-b p-2">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search or add tags…"
            class="border-card-gold/20 bg-card-definition text-text placeholder:text-text/40 focus:border-primary w-full rounded border px-2 py-1.5 text-sm focus:outline-none"
            @keyup.enter="showCreateOption && createTagFromSearch()"
          />
        </div>

        <div
          v-if="showCreateOption"
          class="border-card-gold/10 flex shrink-0 items-center gap-2 border-b px-2 py-2"
        >
          <input
            v-model="newTagColor"
            type="color"
            aria-label="New tag color"
            class="border-text/20 h-7 w-7 shrink-0 cursor-pointer rounded border"
          />
          <button
            type="button"
            class="text-primary flex flex-1 items-center gap-1 truncate text-left text-xs font-medium hover:underline"
            @click="createTagFromSearch"
          >
            <AppIcon
              icon-name="Add"
              :size="12"
              class="shrink-0"
            />
            <span class="truncate">Create "{{ trimmedQuery }}"</span>
          </button>
        </div>

        <div class="max-h-60 overflow-y-auto p-2.5 sm:max-h-80">
          <div class="flex flex-wrap gap-1.5">
            <BaseTag
              v-for="tag in filteredTags"
              :key="tag.id"
              :label="tag.name"
              :color="tag.color"
              selectable
              :selected="tagIds.includes(tag.id)"
              @click="toggleTag(tag.id)"
            />
            <p
              v-if="filteredTags.length === 0 && !showCreateOption"
              class="text-text/35 text-xs"
            >
              {{ tagStore.tags.length === 0 ? 'No tags yet.' : 'No tags match your search.' }}
            </p>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
