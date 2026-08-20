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
  <div class="mb-4 rounded border border-gray-200 p-3">
    <div class="mb-2 flex items-center justify-between gap-2">
      <p class="text-xs font-medium text-gray-600">{{ title }}</p>
      <a
        v-if="getKeyUrl"
        :href="getKeyUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="text-xs font-medium text-black underline underline-offset-2 hover:no-underline"
      >
        {{ getKeyLabel ?? 'Get a free API key' }} ↗
      </a>
    </div>

    <div
      v-if="storedKey"
      class="mb-2 flex items-center gap-1.5 text-xs"
    >
      <span class="inline-flex items-center gap-1 rounded-full bg-black px-2 py-0.5 font-medium text-white">
        ✓ Key Saved
      </span>
      <span class="font-mono text-gray-500">{{ maskedPreview }}</span>
    </div>

    <div class="flex gap-2">
      <BaseInput
        v-model="apiKey"
        :type="isVisible ? 'text' : 'password'"
        :placeholder="keyPlaceholder"
        class="w-full"
      />
      <BaseButton
        variant="ghost"
        size="sm"
        class="shrink-0"
        :aria-label="isVisible ? 'Hide API key' : 'Show API key'"
        @click="isVisible = !isVisible"
      >
        <svg
          v-if="isVisible"
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M2 4.27 3.28 3 21 20.72 19.73 22l-3.08-3.08c-1.44.5-3 .8-4.65.8-5 0-9.27-3.11-11-7.5a11.8 11.8 0 0 1 3.1-4.35L2 4.27ZM12 7a5 5 0 0 1 5 5c0 .64-.13 1.24-.36 1.8l-1.6-1.6a3 3 0 0 0-3.24-3.24l-1.6-1.6c.57-.23 1.17-.36 1.8-.36Zm0-4c5 0 9.27 3.11 11 7.5a11.8 11.8 0 0 1-2.68 3.98l-1.42-1.42A9.8 9.8 0 0 0 21 10.5C19.5 6.94 15.98 4.5 12 4.5c-1.02 0-2 .16-2.93.46L7.6 3.5A11.6 11.6 0 0 1 12 3ZM3.4 10.5A9.8 9.8 0 0 0 12 15.5c.4 0 .8-.03 1.19-.08l-1.8-1.8A3 3 0 0 1 8.4 10.6l-2.4-2.4A9.9 9.9 0 0 0 3.4 10.5Z"
          />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            d="M12 5c-5 0-9.27 3.11-11 7.5 1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5C21.27 8.11 17 5 12 5Zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10ZM12 9.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
          />
        </svg>
        {{ isVisible ? 'Hide' : 'Show' }}
      </BaseButton>
    </div>
    <BaseButton
      v-if="storedKey"
      variant="link"
      size="sm"
      muted
      class="mt-1"
      @click="emit('clear')"
    >
      Remove Key
    </BaseButton>

    <BaseInput
      v-if="baseUrl !== undefined"
      v-model="baseUrl"
      label="Base URL"
      :placeholder="baseUrlPlaceholder"
      class="mt-3 w-full"
    />
    <BaseInput
      v-if="model !== undefined"
      v-model="model"
      label="Model"
      class="mt-3 w-full"
    />
  </div>
</template>
