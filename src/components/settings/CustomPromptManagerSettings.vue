<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue';
import SettingsSectionCard from '@/components/settings/SettingsSectionCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { PROMPT_DEFINITIONS } from '@/services/ai/prompt-registry';
import { useSettingsStore } from '@/stores/settings-store';
import type { PromptKey } from '@/types/settings';

const settingsStore = useSettingsStore();

const drafts = reactive<Record<PromptKey, string>>(
  Object.fromEntries(
    PROMPT_DEFINITIONS.map((definition) => [definition.key, definition.defaultPrompt]),
  ) as Record<PromptKey, string>,
);
const expandedKey = ref<PromptKey | null>(null);
const saveStatus = ref('');

function isCustomized(key: PromptKey): boolean {
  return Boolean(settingsStore.settings.customPrompts?.[key]?.trim());
}

function syncDraftsFromStore() {
  for (const definition of PROMPT_DEFINITIONS) {
    drafts[definition.key] =
      settingsStore.settings.customPrompts?.[definition.key]?.trim() || definition.defaultPrompt;
  }
}

onMounted(syncDraftsFromStore);

// Keeps drafts in sync whenever settings change from outside this component (e.g. "Clear All
// Data" or a backup import), not just from this form's own saves.
watch(() => settingsStore.settings.updatedAt, syncDraftsFromStore);

function toggleExpanded(key: PromptKey) {
  expandedKey.value = expandedKey.value === key ? null : key;
}

async function resetPrompt(key: PromptKey, defaultPrompt: string) {
  drafts[key] = defaultPrompt;
  await settingsStore.setCustomPrompt(key, null);
}

async function saveAllPrompts() {
  for (const definition of PROMPT_DEFINITIONS) {
    const trimmed = drafts[definition.key].trim();
    await settingsStore.setCustomPrompt(
      definition.key,
      trimmed === definition.defaultPrompt.trim() ? null : trimmed,
    );
  }
  saveStatus.value = 'Saved successfully';
  setTimeout(() => (saveStatus.value = ''), 2500);
}
</script>

<template>
  <SettingsSectionCard
    title="AI Prompt Customization"
    description="Fine-tune the exact instructions sent to the AI for each feature. Leave a prompt as-is to keep using the default."
    badge-class="bg-fuchsia-500/10 text-fuchsia-400"
  >
    <template #icon>
      <AppIcon
        icon-name="Edit2"
        :size="18"
      />
    </template>

    <div class="space-y-2">
      <div
        v-for="definition in PROMPT_DEFINITIONS"
        :key="definition.key"
        class="border-text/10 rounded-xl border"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
          @click="toggleExpanded(definition.key)"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-text text-sm font-medium">{{ definition.title }}</span>
              <span
                v-if="isCustomized(definition.key)"
                class="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[11px] font-medium"
              >
                Customized
              </span>
              <span
                v-else
                class="bg-text/10 text-text/50 rounded-full px-2 py-0.5 text-[11px] font-medium"
              >
                Default
              </span>
            </div>
            <p class="text-text/60 mt-0.5 text-xs">{{ definition.description }}</p>
          </div>
          <AppIcon
            icon-name="ArrowDown2"
            :size="16"
            class="text-text/40 shrink-0 transition-transform"
            :class="{ 'rotate-180': expandedKey === definition.key }"
          />
        </button>

        <div
          v-if="expandedKey === definition.key"
          class="border-text/10 border-t px-3 pt-3 pb-3"
        >
          <p class="text-text/50 mb-2 text-xs">Available placeholders:</p>
          <div class="mb-3 flex flex-wrap gap-1.5">
            <span
              v-for="placeholder in definition.placeholders"
              :key="placeholder.token"
              :title="placeholder.description"
              class="bg-text/5 text-text/60 cursor-help rounded-full px-2 py-0.5 font-mono text-[11px]"
            >
              {{ placeholder.token }}
            </span>
          </div>
          <textarea
            v-model="drafts[definition.key]"
            rows="12"
            spellcheck="false"
            class="border-text/20 bg-text/[0.03] text-text focus:border-primary w-full rounded border p-3 font-mono text-xs focus:outline-none"
          />
          <div class="mt-2">
            <BaseButton
              variant="ghost"
              size="sm"
              class="rounded-xl!"
              @click="resetPrompt(definition.key, definition.defaultPrompt)"
            >
              Reset to Default
            </BaseButton>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center gap-3">
      <BaseButton
        variant="primary"
        size="sm"
        class="rounded-xl!"
        @click="saveAllPrompts"
      >
        <AppIcon
          icon-name="TickCircle"
          :size="14"
        />
        Save Custom Prompts
      </BaseButton>
      <span
        v-if="saveStatus"
        class="bg-primary text-background inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      >
        ✓ {{ saveStatus }}
      </span>
    </div>
  </SettingsSectionCard>
</template>
