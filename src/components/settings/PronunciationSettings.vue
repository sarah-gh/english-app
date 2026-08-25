<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
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
  <BaseCard class="mb-6">
    <h2 class="mb-3 text-sm font-semibold text-text">Pronunciation</h2>
    <p class="mb-2 text-xs font-medium text-text/60">Accent</p>
    <BaseSegmentedToggle
      class="mb-3"
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
      @click="testAccent"
    >
      <AppIcon
        icon-name="Play"
        :size="12"
      />
      Test Voice
    </BaseButton>
  </BaseCard>
</template>
