<script setup lang="ts">
import { useRouter } from 'vue-router';

const props = defineProps<{
  name: string;
  cardCount: number;
  to: string;
  /** Pseudo-topics ("All Cards", "Uncategorized") can be opened but not renamed/deleted. */
  editable?: boolean;
}>();

const emit = defineEmits<{ edit: []; delete: [] }>();

const router = useRouter();

function open() {
  router.push(props.to);
}
</script>

<template>
  <div
    class="flex cursor-pointer flex-col gap-1 rounded-xl border border-text/10 bg-white/80 dark:bg-slate-900/80 p-4 hover:border-primary"
    @click="open"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="truncate text-sm font-medium text-text">{{ name }}</span>
      <div
        v-if="editable"
        class="flex shrink-0 items-center gap-0.5"
      >
        <button
          type="button"
          aria-label="Rename topic"
          class="rounded p-1 text-text/35 hover:text-primary"
          @click.stop="emit('edit')"
        >
          <AppIcon
            icon-name="Edit2"
            :size="14"
          />
        </button>
        <button
          type="button"
          aria-label="Delete topic"
          class="rounded p-1 text-text/35 hover:text-danger"
          @click.stop="emit('delete')"
        >
          <AppIcon
            icon-name="Trash"
            :size="14"
          />
        </button>
      </div>
      <AppIcon
        v-else
        icon-name="ArrowRight2"
        :size="14"
        class="shrink-0 text-text/30"
      />
    </div>
    <span class="text-xs text-text/50">{{ cardCount }} card{{ cardCount === 1 ? '' : 's' }}</span>
  </div>
</template>
