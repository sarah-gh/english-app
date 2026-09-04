<script setup lang="ts">
import SettingsSectionCard from '@/components/settings/SettingsSectionCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { isInstallable, isStandalone, promptInstall } from '@/services/pwa/install-prompt';

async function handleInstallClick() {
  await promptInstall();
}
</script>

<template>
  <SettingsSectionCard
    v-if="!isStandalone"
    title="Install Application"
    description="Install Flashcards on this device for quick access and a full-screen, offline-ready experience."
    badge-class="bg-emerald-500/10 text-emerald-500"
  >
    <template #icon>
      <AppIcon
        icon-name="DocumentDownload"
        :size="18"
      />
    </template>
    <BaseButton
      variant="primary"
      size="sm"
      class="rounded-xl!"
      :disabled="!isInstallable"
      @click="handleInstallClick"
    >
      <AppIcon
        icon-name="DocumentDownload"
        :size="14"
      />
      Install Application
    </BaseButton>
    <p
      v-if="!isInstallable"
      class="mt-2 text-xs text-text/35"
    >
      Not available right now — your browser may not support installation, or it may already be
      installed.
    </p>
  </SettingsSectionCard>
</template>
