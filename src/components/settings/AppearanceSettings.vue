<script setup lang="ts">
import SettingsSectionCard from '@/components/settings/SettingsSectionCard.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { useThemeStore } from '@/stores/theme-store';
import type { ThemeMode } from '@/services/theme/apply-theme';

const themeStore = useThemeStore();

const THEME_MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '☀️ Light' },
  { value: 'dark', label: '🌙 Dark' },
  { value: 'system', label: '🖥️ System' },
];

function selectThemeMode(mode: ThemeMode) {
  themeStore.setMode(mode);
}
</script>

<template>
  <SettingsSectionCard
    title="Appearance"
    badge-class="bg-lime-400/10 text-lime-400"
    description="Customize how Flashcards looks."
  >
    <template #icon>
      <AppIcon
        icon-name="Colorfilter"
        :size="18"
      />
    </template>
    <p class="mb-2 text-xs font-medium text-text/60">Theme</p>
    <BaseSegmentedToggle
      class="mb-2"
      tone="recessed"
      :model-value="themeStore.mode"
      :options="THEME_MODE_OPTIONS"
      @update:model-value="selectThemeMode"
    />
    <p class="text-xs text-text/50">
      {{
        themeStore.mode === 'system'
          ? `Following your device's setting (currently ${themeStore.isDark ? 'dark' : 'light'}).`
          : `Always ${themeStore.mode}, regardless of your device's setting.`
      }}
    </p>
  </SettingsSectionCard>
</template>
