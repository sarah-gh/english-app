<script setup lang="ts">
import BaseCard from '@/components/ui/BaseCard.vue';
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
  <BaseCard class="mb-6">
    <h2 class="mb-3 text-sm font-semibold text-text">Appearance</h2>
    <p class="mb-2 text-xs font-medium text-text/60">Theme</p>
    <BaseSegmentedToggle
      class="mb-2"
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
  </BaseCard>
</template>
