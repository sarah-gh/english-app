<script setup lang="ts">
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue';
import { autoUpdate, flip, offset, shift, size, useFloating } from '@floating-ui/vue';
import { computed, ref, useTemplateRef } from 'vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import type { Tag } from '@/types/tag';

const modelValue = defineModel<string[]>({ required: true });

const props = defineProps<{
  tags: Tag[];
}>();

const triggerRef = useTemplateRef<InstanceType<typeof PopoverButton>>('trigger');
const panelRef = useTemplateRef<InstanceType<typeof PopoverPanel>>('panel');

const { floatingStyles } = useFloating(triggerRef, panelRef, {
  placement: 'bottom-start',
  strategy: 'fixed',
  whileElementsMounted: autoUpdate,
  middleware: [
    offset(4),
    // `flip` alone only swaps top/bottom when the panel doesn't fit vertically; without `shift`
    // the panel had no way to pull itself back onto screen horizontally, which is what let it hang
    // off the left/right edge (and, since it also had no max-width, grow as wide as the tag list
    // needed instead of wrapping).
    flip({ padding: 8 }),
    shift({ padding: 8 }),
    size({
      padding: 8,
      apply({ elements, availableWidth, availableHeight }) {
        elements.floating.style.minWidth = '14rem';
        // Caps against the *actual* remaining viewport space, so a narrow phone screen shrinks the
        // panel instead of letting it overflow off-screen the way the fixed w-72 below alone would.
        elements.floating.style.maxWidth = `${Math.min(350, availableWidth)}px`;
        elements.floating.style.maxHeight = `${Math.min(320, availableHeight)}px`;
      },
    }),
  ],
});

const summaryLabel = computed(() =>
  modelValue.value.length === 0 ? 'Tags' : `Tags (${modelValue.value.length})`,
);

const tagSearchQuery = ref('');
const filteredTags = computed(() => {
  const query = tagSearchQuery.value.trim().toLowerCase();
  if (!query) return props.tags;
  return props.tags.filter((tag) => tag.name.toLowerCase().includes(query));
});

function toggleTag(id: string) {
  modelValue.value = modelValue.value.includes(id)
    ? modelValue.value.filter((tagId) => tagId !== id)
    : [...modelValue.value, id];
}
</script>

<template>
  <Popover>
    <PopoverButton
      ref="trigger"
      class="focus:border-primary flex w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm focus:outline-none"
      :class="
        modelValue.length > 0
          ? 'border-primary bg-primary/5 text-primary'
          : 'border-text/20 bg-background text-text'
      "
    >
      <span class="truncate">{{ summaryLabel }}</span>
      <AppIcon
        icon-name="ArrowDown2"
        :size="16"
        class="text-text/50 shrink-0"
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
        class="border-text/10 z-50 flex w-88 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-lg border bg-white/95 shadow-lg dark:bg-slate-900/95"
      >
        <div class="border-text/10 shrink-0 border-b p-2">
          <input
            v-model="tagSearchQuery"
            type="text"
            placeholder="Search tags…"
            class="border-text/20 bg-background text-text placeholder:text-text/40 focus:border-primary w-full rounded border px-2 py-1.5 text-sm focus:outline-none"
          />
        </div>

        <div class="max-h-60 overflow-y-auto p-2.5 sm:max-h-80">
          <div class="flex flex-wrap gap-1.5">
            <BaseTag
              v-for="tag in filteredTags"
              :key="tag.id"
              :label="tag.name"
              :color="tag.color"
              selectable
              :selected="modelValue.includes(tag.id)"
              @click="toggleTag(tag.id)"
            />
            <p
              v-if="filteredTags.length === 0"
              class="text-text/35 text-xs"
            >
              {{ tags.length === 0 ? 'No tags yet.' : 'No tags match your search.' }}
            </p>
          </div>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
