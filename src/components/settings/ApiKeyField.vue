<script setup lang="ts">
import { computed } from 'vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseInput from '@/components/ui/BaseInput.vue';

const props = defineProps<{
  title: string;
  keyPlaceholder: string;
  /** The key currently persisted in Settings (not the draft) — drives the "Key Saved" badge and
   *  masked preview, so they reflect what's actually saved even mid-edit. */
  storedKey: string | null;
  getKeyLabel?: string;
  getKeyUrl?: string;
  baseUrlPlaceholder?: string;
}>();

const apiKey = defineModel<string>('apiKey', { required: true });
/** Omit the `v-model:base-url` / `v-model:model` binding entirely (rather than passing an empty
 *  string) to hide that field for providers that don't use it, e.g. Google AI Studio's fixed
 *  base URL and model. */
const baseUrl = defineModel<string>('baseUrl');
const model = defineModel<string>('model');
const isVisible = defineModel<boolean>('isVisible', { required: true });

const emit = defineEmits<{ clear: [] }>();

/** A subtle "recessed" tint in light mode (`slate-950` has no light-mode token override, so used
 *  bare it renders as a flat, overly heavy gray) and a proper dark inset well once `.dark` is
 *  active — shared by every input in this field for a consistent recessed look. */
const RECESSED_INPUT_CLASS = 'border border-text/10 bg-black/5 dark:bg-slate-950/60';

/** e.g. "sk-•••••••57Ca" — first 3 and last 4 characters, so a saved key is verifiable without
 *  fully exposing it. */
const maskedPreview = computed(() => {
  const key = props.storedKey;
  if (!key) return '';
  if (key.length <= 8) return '•'.repeat(key.length);
  return `${key.slice(0, 3)}${'•'.repeat(7)}${key.slice(-4)}`;
});
</script>

<template>
  <div class="mt-3 mb-4 rounded-xl border border-text/5 bg-black/3 p-4 dark:bg-slate-950/30">
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-xs font-medium text-text/60">{{ title }}</p>
      <a
        v-if="getKeyUrl"
        :href="getKeyUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs font-medium text-primary underline underline-offset-2 hover:no-underline"
      >
        {{ getKeyLabel ?? 'Get a free API key' }} ↗
      </a>
    </div>

    <div
      v-if="storedKey"
      class="mb-2 flex items-center gap-1.5 text-xs"
    >
      <span class="inline-flex items-center gap-1 rounded-lg bg-primary/20 px-2.5 py-1 font-medium text-primary">
        <AppIcon
          icon-name="TickCircle"
          :size="12"
        />
        Key Saved
      </span>
      <span class="font-mono text-text/50">{{ maskedPreview }}</span>
    </div>

    <div class="flex gap-2">
      <BaseInput
        v-model="apiKey"
        :type="isVisible ? 'text' : 'password'"
        :placeholder="keyPlaceholder"
        :input-class="RECESSED_INPUT_CLASS"
        class="w-full"
      />
      <BaseButton
        variant="ghost"
        size="sm"
        class="shrink-0 rounded-xl!"
        :aria-label="isVisible ? 'Hide API key' : 'Show API key'"
        @click="isVisible = !isVisible"
      >
        <AppIcon
          :icon-name="isVisible ? 'EyeSlash' : 'Eye'"
          :size="14"
        />
        {{ isVisible ? 'Hide' : 'Show' }}
      </BaseButton>
    </div>
    <BaseButton
      v-if="storedKey"
      variant="link"
      size="sm"
      danger
      class="mt-1"
      @click="emit('clear')"
    >
      <AppIcon
        icon-name="Trash"
        :size="12"
      />
      Remove Key
    </BaseButton>

    <BaseInput
      v-if="baseUrl !== undefined"
      v-model="baseUrl"
      label="Base URL"
      :placeholder="baseUrlPlaceholder"
      :input-class="RECESSED_INPUT_CLASS"
      class="mt-3 w-full"
    />
    <BaseInput
      v-if="model !== undefined"
      v-model="model"
      label="Model"
      :input-class="RECESSED_INPUT_CLASS"
      class="mt-3 w-full"
    />
  </div>
</template>
