<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import AiProviderSettings from '@/components/settings/AiProviderSettings.vue';
import AppearanceSettings from '@/components/settings/AppearanceSettings.vue';
import DailyGoalSettings from '@/components/settings/DailyGoalSettings.vue';
import DataManagementSettings from '@/components/settings/DataManagementSettings.vue';
import InstallAppSettings from '@/components/settings/InstallAppSettings.vue';
import PronunciationSettings from '@/components/settings/PronunciationSettings.vue';
import { useSettingsStore } from '@/stores/settings-store';

const settingsStore = useSettingsStore();
const isReady = ref(false);

onMounted(async () => {
  await settingsStore.ensureLoaded();
  isReady.value = true;
});
</script>

<template>
  <div class="min-h-screen bg-background px-4 py-6">
    <RouterLink
      to="/"
      class="mb-4 inline-flex items-center gap-1 text-sm text-text/50 hover:text-primary"
    >
      <AppIcon
        icon-name="ArrowLeft"
        :size="14"
      />
      Dashboard
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-text">Settings</h1>

    <p
      v-if="!isReady"
      class="text-sm text-text/50"
    >
      Loading…
    </p>

    <template v-else>
      <AppearanceSettings />
      <PronunciationSettings />
      <DailyGoalSettings />
      <AiProviderSettings />
      <InstallAppSettings />
      <DataManagementSettings />
    </template>
  </div>
</template>
