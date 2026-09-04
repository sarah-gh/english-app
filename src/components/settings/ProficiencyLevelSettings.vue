<script setup lang="ts">
import SettingsSectionCard from '@/components/settings/SettingsSectionCard.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useSettingsStore } from '@/stores/settings-store';
import type { ProficiencyLevel } from '@/types/settings';

const settingsStore = useSettingsStore();

const LEVEL_OPTIONS: { value: ProficiencyLevel; label: string }[] = [
  { value: 'A1', label: 'A1' },
  { value: 'A2', label: 'A2' },
  { value: 'B1', label: 'B1' },
  { value: 'B2', label: 'B2' },
  { value: 'C1', label: 'C1' },
  { value: 'C2', label: 'C2' },
];

async function selectLevel(level: ProficiencyLevel) {
  await settingsStore.setProficiencyLevel(level);
}
</script>

<template>
  <SettingsSectionCard
    title="English Level"
    badge-class="bg-indigo-600/10 text-indigo-600"
    description="Your CEFR proficiency level — matches the AI Quiz Generator's questions and explanations to this level."
  >
    <template #icon>
      <AppIcon
        icon-name="Book1"
        :size="18"
      />
    </template>
    <BaseSegmentedToggle
      size="sm"
      tone="recessed"
      :model-value="settingsStore.settings.proficiencyLevel ?? 'B1'"
      :options="LEVEL_OPTIONS"
      @update:model-value="selectLevel"
    />
  </SettingsSectionCard>
</template>
