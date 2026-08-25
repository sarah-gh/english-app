<script setup lang="ts">
import { computed, ref } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import { useSpeech } from '@/composables/useSpeech';
import { useFetchPronunciationAudio } from '@/queries/use-fetch-pronunciation-audio';
import { useGenerateIpa } from '@/queries/use-generate-ipa';
import { hasRequiredAiCredentials } from '@/services/ai/ai-card-autofill-service';
import { AiServiceError } from '@/services/ai/errors';
import { DictionaryAudioNotFoundError } from '@/services/audio/dictionary-audio.service';
import { useSettingsStore } from '@/stores/settings-store';
import { playAudioBlob } from '@/utils/play-audio-blob';
import AiFieldButton from './AiFieldButton.vue';

const props = defineProps<{
  word: string;
}>();

const ipa = defineModel<string>('ipa', { required: true });
const audioBlob = defineModel<Blob | undefined>('audioBlob');
const ttsEnabled = defineModel<boolean>('ttsEnabled', { required: true });

const { speak, isSupported: isTtsSupported } = useSpeech();

const {
  mutateAsync: fetchPronunciationAudio,
  isPending: isFetchingAudio,
  error: fetchApiError,
} = useFetchPronunciationAudio();
/** Set only for the "enter a word first" guard, which isn't an API failure. */
const localError = ref('');

const fetchError = computed(() => {
  if (localError.value) return localError.value;
  const error = fetchApiError.value;
  if (!error) return '';
  return error instanceof DictionaryAudioNotFoundError
    ? error.message
    : 'Could not reach the pronunciation service.';
});

const settingsStore = useSettingsStore();
const { mutateAsync: requestIpa, isPending: isGeneratingIpa, error: generateIpaApiError } = useGenerateIpa();

const canGenerateIpa = computed(() => hasRequiredAiCredentials(settingsStore.settings) && props.word.trim().length > 0);
const generateIpaErrorMessage = computed(() => {
  const error = generateIpaApiError.value;
  if (!error) return '';
  return error instanceof AiServiceError ? error.message : 'Auto-fill failed. Please try again.';
});

async function generateIpaValue() {
  const title = props.word.trim();
  if (!title) return;
  try {
    ipa.value = await requestIpa({ settings: settingsStore.settings, title });
  } catch {
    // generateIpaErrorMessage (computed above) already reflects the mutation's error state.
  }
}

function speakWord() {
  if (props.word.trim()) speak(props.word);
}

function playCachedAudio() {
  if (audioBlob.value) playAudioBlob(audioBlob.value);
}

async function fetchAudio() {
  if (!props.word.trim()) {
    localError.value = 'Enter the front title first.';
    return;
  }
  localError.value = '';
  try {
    const result = await fetchPronunciationAudio(props.word);
    audioBlob.value = result.audioBlob;
    if (result.phonetic && !ipa.value) ipa.value = result.phonetic;
  } catch {
    // fetchError (computed above) already reflects the mutation's error state.
  }
}

function removeCachedAudio() {
  audioBlob.value = undefined;
}
</script>

<template>
  <div class="space-y-3 rounded-lg border border-text/20 p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-text">Pronunciation</h3>
      <label class="flex items-center gap-2 text-xs text-text/60">
        <input
          v-model="ttsEnabled"
          type="checkbox"
          class="h-4 w-4 accent-primary"
        />
        Enable TTS playback
      </label>
    </div>

    <div>
      <div class="mb-1 flex items-center justify-between gap-2">
        <label
          for="ipa"
          class="block text-xs font-medium text-text/60"
          >IPA (optional)</label
        >
        <AiFieldButton
          :loading="isGeneratingIpa"
          :disabled="!canGenerateIpa"
          :title="word.trim() ? 'Auto-fill this field with AI' : 'Enter a word first to use AI Auto-Fill'"
          @click="generateIpaValue"
        />
      </div>
      <input
        id="ipa"
        v-model="ipa"
        type="text"
        placeholder="/wɜːrd/"
        class="w-full rounded border border-text/20 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!isTtsSupported || !word.trim()"
        class="inline-flex items-center gap-1.5 rounded border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:border-text/20 disabled:text-text/30 disabled:hover:bg-transparent"
        @click="speakWord"
      >
        <AppIcon
          icon-name="VolumeHigh"
          :size="12"
        />
        Speak (TTS)
      </button>

      <button
        type="button"
        :disabled="isFetchingAudio || !word.trim()"
        class="inline-flex items-center gap-1.5 rounded border border-primary px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-background disabled:cursor-not-allowed disabled:border-text/20 disabled:text-text/30 disabled:hover:bg-transparent"
        @click="fetchAudio"
      >
        <AppIcon
          icon-name="DocumentDownload"
          :size="12"
        />
        {{ isFetchingAudio ? 'Fetching…' : 'Fetch Human Audio' }}
      </button>

      <button
        v-if="audioBlob"
        type="button"
        class="inline-flex items-center gap-1.5 rounded border border-text/20 px-3 py-1.5 text-xs font-medium text-text/70 hover:border-primary hover:text-primary"
        @click="playCachedAudio"
      >
        <AppIcon
          icon-name="Play"
          :size="12"
        />
        Play Cached Audio
      </button>

      <button
        v-if="audioBlob"
        type="button"
        class="inline-flex items-center gap-1.5 rounded border border-text/20 px-3 py-1.5 text-xs font-medium text-text/50 hover:border-primary hover:text-primary"
        @click="removeCachedAudio"
      >
        <AppIcon
          icon-name="Trash"
          :size="12"
        />
        Remove Audio
      </button>
    </div>

    <p
      v-if="!isTtsSupported"
      class="flex items-center gap-1.5 text-xs font-medium text-text/60"
    >
      <WarningIcon />
      Speech synthesis isn't supported in this browser.
    </p>
    <p
      v-if="fetchError"
      class="flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ fetchError }}
    </p>
    <p
      v-if="generateIpaErrorMessage"
      class="flex items-center gap-1.5 text-xs font-medium text-danger"
    >
      <WarningIcon />
      {{ generateIpaErrorMessage }}
    </p>
  </div>
</template>
