<script setup lang="ts">
import { ref } from 'vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import { useSpeech } from '@/composables/useSpeech';
import {
  dictionaryAudioService,
  DictionaryAudioNotFoundError,
} from '@/services/audio/dictionary-audio.service';
import { playAudioBlob } from '@/utils/play-audio-blob';

const props = defineProps<{
  word: string;
}>();

const ipa = defineModel<string>('ipa', { required: true });
const audioBlob = defineModel<Blob | undefined>('audioBlob');
const ttsEnabled = defineModel<boolean>('ttsEnabled', { required: true });

const { speak, isSupported: isTtsSupported } = useSpeech();

const isFetchingAudio = ref(false);
const fetchError = ref('');

function speakWord() {
  if (props.word.trim()) speak(props.word);
}

function playCachedAudio() {
  if (audioBlob.value) playAudioBlob(audioBlob.value);
}

async function fetchAudio() {
  if (!props.word.trim()) {
    fetchError.value = 'Enter the front title first.';
    return;
  }
  isFetchingAudio.value = true;
  fetchError.value = '';
  try {
    const result = await dictionaryAudioService.fetchPronunciation(props.word);
    audioBlob.value = result.audioBlob;
    if (result.phonetic && !ipa.value) ipa.value = result.phonetic;
  } catch (error) {
    fetchError.value =
      error instanceof DictionaryAudioNotFoundError
        ? error.message
        : 'Could not reach the pronunciation service.';
  } finally {
    isFetchingAudio.value = false;
  }
}

function removeCachedAudio() {
  audioBlob.value = undefined;
}
</script>

<template>
  <div class="space-y-3 rounded-lg border border-gray-300 p-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-black">Pronunciation</h3>
      <label class="flex items-center gap-2 text-xs text-gray-600">
        <input
          v-model="ttsEnabled"
          type="checkbox"
          class="h-4 w-4 accent-black"
        />
        Enable TTS playback
      </label>
    </div>

    <div>
      <label
        for="ipa"
        class="mb-1 block text-xs font-medium text-gray-600"
        >IPA (optional)</label
      >
      <input
        id="ipa"
        v-model="ipa"
        type="text"
        placeholder="/wɜːrd/"
        class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
      />
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        :disabled="!isTtsSupported || !word.trim()"
        class="rounded border border-black px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
        @click="speakWord"
      >
        Speak (TTS)
      </button>

      <button
        type="button"
        :disabled="isFetchingAudio || !word.trim()"
        class="rounded border border-black px-3 py-1.5 text-xs font-medium text-black transition-colors hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
        @click="fetchAudio"
      >
        {{ isFetchingAudio ? 'Fetching…' : 'Fetch Human Audio' }}
      </button>

      <button
        v-if="audioBlob"
        type="button"
        class="inline-flex items-center gap-1.5 rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-black hover:text-black"
        @click="playCachedAudio"
      >
        <svg
          viewBox="0 0 24 24"
          width="12"
          height="12"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
        Play Cached Audio
      </button>

      <button
        v-if="audioBlob"
        type="button"
        class="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-500 hover:border-black hover:text-black"
        @click="removeCachedAudio"
      >
        Remove Audio
      </button>
    </div>

    <p
      v-if="!isTtsSupported"
      class="flex items-center gap-1.5 text-xs font-medium text-gray-600"
    >
      <WarningIcon />
      Speech synthesis isn't supported in this browser.
    </p>
    <p
      v-if="fetchError"
      class="flex items-center gap-1.5 text-xs font-medium text-gray-800"
    >
      <WarningIcon />
      {{ fetchError }}
    </p>
  </div>
</template>
