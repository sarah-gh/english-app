<script setup lang="ts">
import SettingsSectionCard from '@/components/settings/SettingsSectionCard.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import { speechSynthesisService } from '@/services/tts/speech-synthesis.service';
import { useSettingsStore } from '@/stores/settings-store';
import type { SpeechAccent } from '@/types/settings';

const settingsStore = useSettingsStore();

async function selectAccent(accent: SpeechAccent) {
  await settingsStore.setSpeechAccent(accent);
}

function testAccent() {
  speechSynthesisService.speak(
    'This is a test of the selected voice.',
    settingsStore.settings.speechAccent,
  );
}
</script>

<template>
  <SettingsSectionCard
    title="Pronunciation"
    badge-class="bg-red-400/10 text-red-400"
    description="Choose your preferred accent."
  >
    <template #icon>
      <AppIcon
        icon-name="VolumeHigh"
        :size="18"
      />
    </template>
    <p class="mb-2 text-xs font-medium text-text/60">Accent</p>
    <BaseSegmentedToggle
      class="mb-3"
      tone="recessed"
      :model-value="settingsStore.settings.speechAccent"
      :options="[
        { value: 'en-US', label: 'US English' },
        { value: 'en-GB', label: 'UK English' },
      ]"
      @update:model-value="selectAccent"
    />
    <BaseButton
      variant="secondary"
      size="sm"
      class="rounded-xl!"
      @click="testAccent"
    >
      <AppIcon
        icon-name="Play"
        :size="12"
      />
      Test Voice
    </BaseButton>
  </SettingsSectionCard>
</template>
