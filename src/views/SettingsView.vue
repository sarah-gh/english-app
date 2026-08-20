<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseInput from '@/components/ui/BaseInput.vue';
import { exportBackup } from '@/services/backup/exporter';
import { BackupImportError, importBackup, type ImportSummary } from '@/services/backup/importer';
import { clearAllData } from '@/services/data/reset-data';
import { isInstallable, isStandalone, promptInstall } from '@/services/pwa/install-prompt';
import { speechSynthesisService } from '@/services/tts/speech-synthesis.service';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import { DEFAULT_AIHUBMIX_BASE_URL, type AiProvider, type SpeechAccent } from '@/types/settings';

const settingsStore = useSettingsStore();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();

const isReady = ref(false);

const aiProviderDraft = ref<AiProvider>('gemini');
const geminiKeyDraft = ref('');
const aihubmixKeyDraft = ref('');
const aihubmixBaseUrlDraft = ref(DEFAULT_AIHUBMIX_BASE_URL);
const isGeminiKeyVisible = ref(false);
const isAihubmixKeyVisible = ref(false);
const aiConfigStatus = ref('');

onMounted(async () => {
  await settingsStore.ensureLoaded();
  aiProviderDraft.value = settingsStore.settings.aiProvider;
  geminiKeyDraft.value = settingsStore.settings.geminiApiKey ?? '';
  aihubmixKeyDraft.value = settingsStore.settings.aihubmixApiKey ?? '';
  aihubmixBaseUrlDraft.value = settingsStore.settings.aihubmixBaseUrl;
  isReady.value = true;
});

async function selectAccent(accent: SpeechAccent) {
  await settingsStore.setSpeechAccent(accent);
}

function testAccent() {
  speechSynthesisService.speak(
    'This is a test of the selected voice.',
    settingsStore.settings.speechAccent,
  );
}

async function saveAiConfig() {
  await settingsStore.setAiConfig({
    aiProvider: aiProviderDraft.value,
    geminiApiKey: geminiKeyDraft.value.trim() || null,
    aihubmixApiKey: aihubmixKeyDraft.value.trim() || null,
    aihubmixBaseUrl: aihubmixBaseUrlDraft.value.trim() || DEFAULT_AIHUBMIX_BASE_URL,
  });
  aiConfigStatus.value = 'Saved.';
  setTimeout(() => (aiConfigStatus.value = ''), 2000);
}

async function selectAiProvider(provider: AiProvider) {
  aiProviderDraft.value = provider;
  await saveAiConfig();
}

async function clearGeminiKey() {
  geminiKeyDraft.value = '';
  await saveAiConfig();
}

async function clearAihubmixKey() {
  aihubmixKeyDraft.value = '';
  await saveAiConfig();
}

// --- PWA install ---
async function handleInstallClick() {
  await promptInstall();
}

// --- Backup ---
const isExporting = ref(false);
const isImporting = ref(false);
const importError = ref('');
const importSummary = ref<ImportSummary | null>(null);
const fileInput = ref<HTMLInputElement>();

async function handleExport() {
  isExporting.value = true;
  try {
    await exportBackup();
  } finally {
    isExporting.value = false;
  }
}

function triggerImportPicker() {
  fileInput.value?.click();
}

async function refreshStores() {
  await Promise.all([cardStore.fetchAll(), deckStore.fetchAll(), tagStore.fetchAll()]);
}

async function handleFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  importError.value = '';
  importSummary.value = null;
  isImporting.value = true;
  try {
    const summary = await importBackup(file);
    await refreshStores();
    importSummary.value = summary;
  } catch (error) {
    importError.value =
      error instanceof BackupImportError
        ? error.message
        : 'Import failed. Please check the file and try again.';
  } finally {
    isImporting.value = false;
    if (fileInput.value) fileInput.value.value = '';
  }
}

// --- Clear all data ---
const isConfirmingClear = ref(false);

async function handleClearAll() {
  await clearAllData();
  await Promise.all([
    cardStore.fetchAll(),
    deckStore.fetchAll(),
    tagStore.fetchAll(),
    settingsStore.fetchSettings(),
  ]);
  aiProviderDraft.value = 'gemini';
  geminiKeyDraft.value = '';
  aihubmixKeyDraft.value = '';
  aihubmixBaseUrlDraft.value = DEFAULT_AIHUBMIX_BASE_URL;
  isConfirmingClear.value = false;
}
</script>

<template>
  <div class="min-h-screen bg-white px-4 py-6">
    <RouterLink
      to="/"
      class="mb-4 inline-block text-sm text-gray-500 hover:text-black"
    >
      ← Dashboard
    </RouterLink>
    <h1 class="mb-6 text-xl font-semibold text-black">Settings</h1>

    <p
      v-if="!isReady"
      class="text-sm text-gray-500"
    >
      Loading…
    </p>

    <template v-else>
      <BaseCard class="mb-6">
        <h2 class="mb-3 text-sm font-semibold text-black">Pronunciation</h2>
        <p class="mb-2 text-xs font-medium text-gray-600">Accent</p>
        <div class="mb-3 flex rounded-lg border border-black p-1">
          <button
            type="button"
            class="flex-1 rounded py-2 text-sm font-medium transition-colors"
            :class="
              settingsStore.settings.speechAccent === 'en-US'
                ? 'bg-black text-white'
                : 'text-black hover:bg-gray-100'
            "
            @click="selectAccent('en-US')"
          >
            US English
          </button>
          <button
            type="button"
            class="flex-1 rounded py-2 text-sm font-medium transition-colors"
            :class="
              settingsStore.settings.speechAccent === 'en-GB'
                ? 'bg-black text-white'
                : 'text-black hover:bg-gray-100'
            "
            @click="selectAccent('en-GB')"
          >
            UK English
          </button>
        </div>
        <BaseButton
          variant="secondary"
          size="sm"
          @click="testAccent"
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
          Test Voice
        </BaseButton>
      </BaseCard>

      <BaseCard class="mb-6">
        <h2 class="mb-1 text-sm font-semibold text-black">AI Quiz Generator</h2>
        <p class="mb-3 text-xs text-gray-500">
          Configure the provider(s) used to generate quizzes from your flashcards. Keys are stored
          only on this device — never included in exports.
        </p>

        <p class="mb-2 text-xs font-medium text-gray-600">Provider</p>
        <div class="mb-4 flex flex-col gap-1 rounded-lg border border-black p-1 sm:flex-row">
          <button
            type="button"
            class="flex-1 rounded px-2 py-2 text-sm font-medium transition-colors"
            :class="
              aiProviderDraft === 'gemini' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
            "
            @click="selectAiProvider('gemini')"
          >
            Direct Gemini
          </button>
          <button
            type="button"
            class="flex-1 rounded px-2 py-2 text-sm font-medium transition-colors"
            :class="
              aiProviderDraft === 'aihubmix' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
            "
            @click="selectAiProvider('aihubmix')"
          >
            AIHubMix Proxy
          </button>
          <button
            type="button"
            class="flex-1 rounded px-2 py-2 text-sm font-medium transition-colors"
            :class="
              aiProviderDraft === 'fallback' ? 'bg-black text-white' : 'text-black hover:bg-gray-100'
            "
            @click="selectAiProvider('fallback')"
          >
            Automatic Fallback
          </button>
        </div>
        <p
          v-if="aiProviderDraft === 'fallback'"
          class="mb-4 -mt-2 text-xs text-gray-500"
        >
          Tries Gemini first. If it fails (network error, rate limit, server error), AIHubMix is
          retried automatically using the credentials below.
        </p>

        <div class="mb-4">
          <p class="mb-2 text-xs font-medium text-gray-600">Gemini API Key</p>
          <div class="flex gap-2">
            <BaseInput
              v-model="geminiKeyDraft"
              :type="isGeminiKeyVisible ? 'text' : 'password'"
              placeholder="Paste your Gemini API key"
              class="w-full"
            />
            <BaseButton
              variant="ghost"
              size="sm"
              class="shrink-0"
              @click="isGeminiKeyVisible = !isGeminiKeyVisible"
            >
              {{ isGeminiKeyVisible ? 'Hide' : 'Show' }}
            </BaseButton>
          </div>
          <BaseButton
            v-if="settingsStore.settings.geminiApiKey"
            variant="link"
            size="sm"
            muted
            class="mt-1"
            @click="clearGeminiKey"
          >
            Remove Key
          </BaseButton>
        </div>

        <div class="mb-4">
          <p class="mb-2 text-xs font-medium text-gray-600">AIHubMix API Key</p>
          <div class="flex gap-2">
            <BaseInput
              v-model="aihubmixKeyDraft"
              :type="isAihubmixKeyVisible ? 'text' : 'password'"
              placeholder="Paste your AIHubMix API key"
              class="w-full"
            />
            <BaseButton
              variant="ghost"
              size="sm"
              class="shrink-0"
              @click="isAihubmixKeyVisible = !isAihubmixKeyVisible"
            >
              {{ isAihubmixKeyVisible ? 'Hide' : 'Show' }}
            </BaseButton>
          </div>
          <BaseButton
            v-if="settingsStore.settings.aihubmixApiKey"
            variant="link"
            size="sm"
            muted
            class="mt-1"
            @click="clearAihubmixKey"
          >
            Remove Key
          </BaseButton>
        </div>

        <div class="mb-4">
          <p class="mb-2 text-xs font-medium text-gray-600">AIHubMix Base URL</p>
          <BaseInput
            v-model="aihubmixBaseUrlDraft"
            placeholder="https://aihubmix.com"
            class="w-full"
          />
        </div>

        <div class="flex items-center gap-3">
          <BaseButton
            variant="primary"
            size="sm"
            @click="saveAiConfig"
          >
            Save
          </BaseButton>
          <span
            v-if="aiConfigStatus"
            class="text-xs font-medium text-gray-700"
            >{{ aiConfigStatus }}</span
          >
        </div>
      </BaseCard>

      <BaseCard
        v-if="!isStandalone"
        class="mb-6"
      >
        <h2 class="mb-1 text-sm font-semibold text-black">Install Application</h2>
        <p class="mb-3 text-xs text-gray-500">
          Install Flashcards on this device for quick access and a full-screen, offline-ready
          experience.
        </p>
        <BaseButton
          variant="primary"
          size="sm"
          :disabled="!isInstallable"
          @click="handleInstallClick"
        >
          Install Application
        </BaseButton>
        <p
          v-if="!isInstallable"
          class="mt-2 text-xs text-gray-400"
        >
          Not available right now — your browser may not support installation, or it may already
          be installed.
        </p>
      </BaseCard>

      <BaseCard class="mb-6">
        <h2 class="mb-1 text-sm font-semibold text-black">Backup &amp; Data</h2>
        <p class="mb-4 text-xs text-gray-500">
          Export everything into a single .zip file, or import one to restore or merge data on
          this or another device.
        </p>

        <div class="mb-3 flex flex-wrap gap-3">
          <BaseButton
            variant="secondary"
            size="sm"
            :loading="isExporting"
            @click="handleExport"
          >
            {{ isExporting ? 'Exporting…' : 'Export Backup (.zip)' }}
          </BaseButton>
          <BaseButton
            variant="secondary"
            size="sm"
            :loading="isImporting"
            @click="triggerImportPicker"
          >
            {{ isImporting ? 'Importing…' : 'Import Backup (.zip)' }}
          </BaseButton>
          <input
            ref="fileInput"
            type="file"
            accept=".zip"
            class="hidden"
            @change="handleFileSelected"
          />
        </div>

        <p
          v-if="importSummary"
          class="text-xs font-medium text-gray-700"
        >
          Imported {{ importSummary.decks }} deck(s), {{ importSummary.tags }} tag(s),
          {{ importSummary.cards }} card(s).
        </p>
        <p
          v-if="importError"
          class="flex items-center gap-1.5 text-xs font-medium text-gray-800"
        >
          <WarningIcon />
          {{ importError }}
        </p>
      </BaseCard>

      <BaseCard>
        <h2 class="mb-1 text-sm font-semibold text-black">Danger Zone</h2>
        <p class="mb-3 text-xs text-gray-500">
          Permanently deletes every deck, card, and tag on this device, and resets your settings.
          This can't be undone.
        </p>
        <BaseButton
          variant="primary"
          size="sm"
          @click="isConfirmingClear = true"
        >
          Clear All Data
        </BaseButton>
      </BaseCard>
    </template>

    <ConfirmDialog
      v-if="isConfirmingClear"
      title="Clear all data?"
      message="This permanently deletes every deck, card, and tag on this device, and resets your settings. This can't be undone."
      confirm-label="Clear Everything"
      @confirm="handleClearAll"
      @cancel="isConfirmingClear = false"
    />
  </div>
</template>
