<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ConfirmDialog from '@/components/app/ConfirmDialog.vue';
import WarningIcon from '@/components/app/WarningIcon.vue';
import ApiKeyField from '@/components/settings/ApiKeyField.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseSegmentedToggle from '@/components/ui/BaseSegmentedToggle.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { exportBackup } from '@/services/backup/exporter';
import { BackupImportError, importBackup, type ImportSummary } from '@/services/backup/importer';
import { clearAllData } from '@/services/data/reset-data';
import { isInstallable, isStandalone, promptInstall } from '@/services/pwa/install-prompt';
import { speechSynthesisService } from '@/services/tts/speech-synthesis.service';
import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useTagStore } from '@/stores/tag-store';
import {
  DEFAULT_AIHUBMIX_BASE_URL,
  DEFAULT_GROQ_BASE_URL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  type AiProvider,
  type ConcreteAiProvider,
  type SpeechAccent,
} from '@/types/settings';

const settingsStore = useSettingsStore();
const cardStore = useCardStore();
const deckStore = useDeckStore();
const tagStore = useTagStore();

const isReady = ref(false);

const PROVIDER_MODE_OPTIONS: { value: AiProvider; label: string }[] = [
  { value: 'google', label: 'Google AI Studio (Gemini)' },
  { value: 'groq', label: 'Groq (ultra-fast, free)' },
  { value: 'openrouter', label: 'OpenRouter (free models)' },
  { value: 'aihubmix', label: 'AIHubMix Proxy' },
  { value: 'fallback', label: 'Automatic Fallback' },
];

const CONCRETE_PROVIDER_OPTIONS: { value: ConcreteAiProvider; label: string }[] = [
  { value: 'google', label: 'Google AI Studio' },
  { value: 'groq', label: 'Groq' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'aihubmix', label: 'AIHubMix' },
];

const aiProviderDraft = ref<AiProvider>('google');
const fallbackPrimaryDraft = ref<ConcreteAiProvider>('google');
const fallbackBackupDraft = ref<ConcreteAiProvider>('groq');

const googleKeyDraft = ref('');
const groqKeyDraft = ref('');
const groqBaseUrlDraft = ref(DEFAULT_GROQ_BASE_URL);
const groqModelDraft = ref(DEFAULT_GROQ_MODEL);
const openrouterKeyDraft = ref('');
const openrouterBaseUrlDraft = ref(DEFAULT_OPENROUTER_BASE_URL);
const openrouterModelDraft = ref(DEFAULT_OPENROUTER_MODEL);
const aihubmixKeyDraft = ref('');
const aihubmixBaseUrlDraft = ref(DEFAULT_AIHUBMIX_BASE_URL);

const isGoogleKeyVisible = ref(false);
const isGroqKeyVisible = ref(false);
const isOpenrouterKeyVisible = ref(false);
const isAihubmixKeyVisible = ref(false);
const aiConfigStatus = ref('');

function resetAiConfigDrafts() {
  aiProviderDraft.value = 'google';
  fallbackPrimaryDraft.value = 'google';
  fallbackBackupDraft.value = 'groq';
  googleKeyDraft.value = '';
  groqKeyDraft.value = '';
  groqBaseUrlDraft.value = DEFAULT_GROQ_BASE_URL;
  groqModelDraft.value = DEFAULT_GROQ_MODEL;
  openrouterKeyDraft.value = '';
  openrouterBaseUrlDraft.value = DEFAULT_OPENROUTER_BASE_URL;
  openrouterModelDraft.value = DEFAULT_OPENROUTER_MODEL;
  aihubmixKeyDraft.value = '';
  aihubmixBaseUrlDraft.value = DEFAULT_AIHUBMIX_BASE_URL;
}

onMounted(async () => {
  await settingsStore.ensureLoaded();
  const settings = settingsStore.settings;
  aiProviderDraft.value = settings.aiProvider;
  fallbackPrimaryDraft.value = settings.fallbackPrimaryProvider;
  fallbackBackupDraft.value = settings.fallbackBackupProvider;
  googleKeyDraft.value = settings.googleApiKey ?? '';
  groqKeyDraft.value = settings.groqApiKey ?? '';
  groqBaseUrlDraft.value = settings.groqBaseUrl;
  groqModelDraft.value = settings.groqModel;
  openrouterKeyDraft.value = settings.openrouterApiKey ?? '';
  openrouterBaseUrlDraft.value = settings.openrouterBaseUrl;
  openrouterModelDraft.value = settings.openrouterModel;
  aihubmixKeyDraft.value = settings.aihubmixApiKey ?? '';
  aihubmixBaseUrlDraft.value = settings.aihubmixBaseUrl;
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

/** Pre-fills a provider's standard base URL the moment it's selected, if the field is still
 *  empty (e.g. first time that provider is picked, or the user cleared it). */
function prefillBaseUrlIfEmpty(provider: ConcreteAiProvider) {
  if (provider === 'groq' && !groqBaseUrlDraft.value.trim()) groqBaseUrlDraft.value = DEFAULT_GROQ_BASE_URL;
  if (provider === 'openrouter' && !openrouterBaseUrlDraft.value.trim()) {
    openrouterBaseUrlDraft.value = DEFAULT_OPENROUTER_BASE_URL;
  }
  if (provider === 'aihubmix' && !aihubmixBaseUrlDraft.value.trim()) {
    aihubmixBaseUrlDraft.value = DEFAULT_AIHUBMIX_BASE_URL;
  }
}

async function saveAiConfig() {
  await settingsStore.setAiConfig({
    aiProvider: aiProviderDraft.value,
    fallbackPrimaryProvider: fallbackPrimaryDraft.value,
    fallbackBackupProvider: fallbackBackupDraft.value,
    googleApiKey: googleKeyDraft.value.trim() || null,
    groqApiKey: groqKeyDraft.value.trim() || null,
    groqBaseUrl: groqBaseUrlDraft.value.trim() || DEFAULT_GROQ_BASE_URL,
    groqModel: groqModelDraft.value.trim() || DEFAULT_GROQ_MODEL,
    openrouterApiKey: openrouterKeyDraft.value.trim() || null,
    openrouterBaseUrl: openrouterBaseUrlDraft.value.trim() || DEFAULT_OPENROUTER_BASE_URL,
    openrouterModel: openrouterModelDraft.value.trim() || DEFAULT_OPENROUTER_MODEL,
    aihubmixApiKey: aihubmixKeyDraft.value.trim() || null,
    aihubmixBaseUrl: aihubmixBaseUrlDraft.value.trim() || DEFAULT_AIHUBMIX_BASE_URL,
  });
  aiConfigStatus.value = 'Saved successfully';
  setTimeout(() => (aiConfigStatus.value = ''), 2500);
}

async function selectAiProvider(provider: AiProvider) {
  aiProviderDraft.value = provider;
  if (provider !== 'fallback') prefillBaseUrlIfEmpty(provider);
  await saveAiConfig();
}

async function selectFallbackPrimary(provider: ConcreteAiProvider) {
  fallbackPrimaryDraft.value = provider;
  prefillBaseUrlIfEmpty(provider);
  await saveAiConfig();
}

async function selectFallbackBackup(provider: ConcreteAiProvider) {
  fallbackBackupDraft.value = provider;
  prefillBaseUrlIfEmpty(provider);
  await saveAiConfig();
}

async function clearGoogleKey() {
  googleKeyDraft.value = '';
  await saveAiConfig();
}

async function clearGroqKey() {
  groqKeyDraft.value = '';
  await saveAiConfig();
}

async function clearOpenrouterKey() {
  openrouterKeyDraft.value = '';
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
  resetAiConfigDrafts();
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
          Configure the provider(s) used to generate quizzes and auto-fill cards. Keys are stored
          only on this device — never included in exports.
        </p>

        <BaseSelect
          :model-value="aiProviderDraft"
          label="Provider"
          class="mb-2"
          @update:model-value="(value) => selectAiProvider(value as AiProvider)"
        >
          <option
            v-for="option in PROVIDER_MODE_OPTIONS"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </BaseSelect>

        <template v-if="aiProviderDraft === 'fallback'">
          <p class="mb-3 text-xs text-gray-500">
            Tries the primary provider first. If it fails (network error, rate limit, server
            error, or a missing key), a warning is logged and the backup provider is retried
            automatically using the credentials below.
          </p>
          <div class="mb-4 grid grid-cols-2 gap-2">
            <BaseSelect
              :model-value="fallbackPrimaryDraft"
              label="Primary Provider"
              @update:model-value="(value) => selectFallbackPrimary(value as ConcreteAiProvider)"
            >
              <option
                v-for="option in CONCRETE_PROVIDER_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </BaseSelect>
            <BaseSelect
              :model-value="fallbackBackupDraft"
              label="Backup Provider"
              @update:model-value="(value) => selectFallbackBackup(value as ConcreteAiProvider)"
            >
              <option
                v-for="option in CONCRETE_PROVIDER_OPTIONS"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </BaseSelect>
          </div>
        </template>

        <ApiKeyField
          v-model:api-key="googleKeyDraft"
          v-model:is-visible="isGoogleKeyVisible"
          title="Google AI Studio API Key"
          key-placeholder="Paste your Google AI Studio API key"
          get-key-url="https://aistudio.google.com/apikey"
          :stored-key="settingsStore.settings.googleApiKey"
          @clear="clearGoogleKey"
        />

        <ApiKeyField
          v-model:api-key="groqKeyDraft"
          v-model:is-visible="isGroqKeyVisible"
          v-model:base-url="groqBaseUrlDraft"
          v-model:model="groqModelDraft"
          title="Groq API Key"
          key-placeholder="Paste your Groq API key"
          get-key-url="https://console.groq.com/keys"
          base-url-placeholder="https://api.groq.com/openai/v1"
          :stored-key="settingsStore.settings.groqApiKey"
          @clear="clearGroqKey"
        />

        <ApiKeyField
          v-model:api-key="openrouterKeyDraft"
          v-model:is-visible="isOpenrouterKeyVisible"
          v-model:base-url="openrouterBaseUrlDraft"
          v-model:model="openrouterModelDraft"
          title="OpenRouter API Key"
          key-placeholder="Paste your OpenRouter API key"
          get-key-url="https://openrouter.ai/keys"
          base-url-placeholder="https://openrouter.ai/api/v1"
          :stored-key="settingsStore.settings.openrouterApiKey"
          @clear="clearOpenrouterKey"
        />

        <ApiKeyField
          v-model:api-key="aihubmixKeyDraft"
          v-model:is-visible="isAihubmixKeyVisible"
          v-model:base-url="aihubmixBaseUrlDraft"
          title="AIHubMix API Key"
          key-placeholder="Paste your AIHubMix API key"
          get-key-url="https://aihubmix.com"
          base-url-placeholder="https://aihubmix.com"
          :stored-key="settingsStore.settings.aihubmixApiKey"
          @clear="clearAihubmixKey"
        />

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
            class="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-xs font-medium text-white"
          >
            ✓ {{ aiConfigStatus }}
          </span>
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
