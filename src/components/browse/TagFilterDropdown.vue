<script setup lang="ts">
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/vue';
import { autoUpdate, flip, offset, size, useFloating } from '@floating-ui/vue';
import { computed, useTemplateRef } from 'vue';
import BaseTag from '@/components/ui/BaseTag.vue';
import type { Tag } from '@/types/tag';

const modelValue = defineModel<string[]>({ required: true });

defineProps<{
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
    flip({ padding: 8 }),
    size({
      padding: 8,
      apply({ elements }) {
        elements.floating.style.minWidth = '14rem';
      },
    }),
  ],
});

const summaryLabel = computed(() =>
  modelValue.value.length === 0 ? 'Tags' : `Tags (${modelValue.value.length})`,
);

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
      class="flex w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm focus:border-primary focus:outline-none"
      :class="modelValue.length > 0 ? 'border-primary bg-primary/5 text-primary' : 'border-text/20 bg-background text-text'"
    >
      <span class="truncate">{{ summaryLabel }}</span>
      <AppIcon
        icon-name="ArrowDown2"
        :size="16"
        class="shrink-0 text-text/50"
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
        class="z-50 max-h-64 overflow-auto rounded-lg border border-text/10 bg-white/95 p-2.5 shadow-lg dark:bg-slate-900/95"
      >
        <div class="flex flex-wrap gap-1.5">
          <BaseTag
            v-for="tag in tags"
            :key="tag.id"
            :label="tag.name"
            :color="tag.color"
            selectable
            :selected="modelValue.includes(tag.id)"
            @click="toggleTag(tag.id)"
          />
          <p
            v-if="tags.length === 0"
            class="text-xs text-text/35"
          >
            No tags yet.
          </p>
        </div>
      </PopoverPanel>
    </transition>
  </Popover>
</template>
