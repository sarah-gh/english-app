<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import ApiKeyField from '@/components/settings/ApiKeyField.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import BaseSelect from '@/components/ui/BaseSelect.vue';
import { AiProviderError } from '@/services/ai/errors';
import { testProviderConnection } from '@/services/ai/test-connection';
import { useSettingsStore } from '@/stores/settings-store';
import {
  DEFAULT_AIHUBMIX_BASE_URL,
  DEFAULT_GROQ_BASE_URL,
  DEFAULT_GROQ_MODEL,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  type AiProvider,
  type ConcreteAiProvider,
} from '@/types/settings';

const settingsStore = useSettingsStore();

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

/** Only the concrete provider(s) actually in play for the current selection get their key/model
 *  fields rendered — a single provider, or both legs of the fallback pair. */
const visibleProviders = computed<ConcreteAiProvider[]>(() => {
  if (aiProviderDraft.value === 'fallback') {
    return [...new Set([fallbackPrimaryDraft.value, fallbackBackupDraft.value])];
  }
  return [aiProviderDraft.value];
});

type TestState = { status: 'idle' | 'testing' | 'success' | 'error'; message: string };
const testStatus = reactive<Record<ConcreteAiProvider, TestState>>({
  google: { status: 'idle', message: '' },
  groq: { status: 'idle', message: '' },
  openrouter: { status: 'idle', message: '' },
  aihubmix: { status: 'idle', message: '' },
});

function resetTestStatus() {
  for (const provider of CONCRETE_PROVIDER_OPTIONS) {
    testStatus[provider.value] = { status: 'idle', message: '' };
  }
}

async function runTest(provider: ConcreteAiProvider) {
  testStatus[provider] = { status: 'testing', message: '' };
  try {
    switch (provider) {
      case 'google':
        await testProviderConnection('google', googleKeyDraft.value, '', '');
        break;
      case 'groq':
        await testProviderConnection('groq', groqKeyDraft.value, groqBaseUrlDraft.value, groqModelDraft.value);
        break;
      case 'openrouter':
        await testProviderConnection(
          'openrouter',
          openrouterKeyDraft.value,
          openrouterBaseUrlDraft.value,
          openrouterModelDraft.value,
        );
        break;
      case 'aihubmix':
        await testProviderConnection('aihubmix', aihubmixKeyDraft.value, aihubmixBaseUrlDraft.value, '');
        break;
    }
    testStatus[provider] = { status: 'success', message: 'Connected' };
  } catch (error) {
    testStatus[provider] = {
      status: 'error',
      message: error instanceof AiProviderError ? error.message : 'Connection failed. Check your network.',
    };
  }
}

function syncDraftsFromStore() {
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
  resetTestStatus();
}

onMounted(syncDraftsFromStore);

// Keeps drafts in sync whenever settings change from outside this component (e.g. "Clear All
// Data" or a backup import), not just from this form's own saves.
watch(() => settingsStore.settings.updatedAt, syncDraftsFromStore);

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
</script>

<template>
  <BaseCard class="mb-6">
    <h2 class="mb-1 text-sm font-semibold text-text">AI Quiz Generator</h2>
    <p class="mb-3 text-xs text-text/50">
      Configure the provider(s) used to generate quizzes and auto-fill cards. Keys are stored only
      on this device — never included in exports.
    </p>

    <BaseSelect
      :model-value="aiProviderDraft"
      label="Active Provider"
      class="mb-4"
      :options="PROVIDER_MODE_OPTIONS"
      @update:model-value="(value) => selectAiProvider(value as AiProvider)"
    />

    <template v-if="aiProviderDraft === 'fallback'">
      <p class="mb-3 text-xs text-text/50">
        Tries the primary provider first. If it fails (network error, rate limit, server error, or
        a missing key), a warning is logged and the backup provider is retried automatically using
        the credentials below.
      </p>
      <div class="mb-4 grid grid-cols-2 gap-2">
        <BaseSelect
          :model-value="fallbackPrimaryDraft"
          label="Primary Provider"
          :options="CONCRETE_PROVIDER_OPTIONS"
          @update:model-value="(value) => selectFallbackPrimary(value as ConcreteAiProvider)"
        />
        <BaseSelect
          :model-value="fallbackBackupDraft"
          label="Backup Provider"
          :options="CONCRETE_PROVIDER_OPTIONS"
          @update:model-value="(value) => selectFallbackBackup(value as ConcreteAiProvider)"
        />
      </div>
    </template>

    <template v-if="visibleProviders.includes('google')">
      <ApiKeyField
        v-model:api-key="googleKeyDraft"
        v-model:is-visible="isGoogleKeyVisible"
        title="Google AI Studio API Key"
        key-placeholder="Paste your Google AI Studio API key"
        get-key-url="https://aistudio.google.com/apikey"
        :stored-key="settingsStore.settings.googleApiKey"
        @clear="clearGoogleKey"
      />
      <div class="-mt-2 mb-4 flex items-center gap-2">
        <BaseButton
          variant="ghost"
          size="sm"
          :loading="testStatus.google.status === 'testing'"
          @click="runTest('google')"
        >
          Test Connection
        </BaseButton>
        <span
          v-if="testStatus.google.status === 'success'"
          class="text-xs font-medium text-primary"
        >
          ✓ {{ testStatus.google.message }}
        </span>
        <span
          v-if="testStatus.google.status === 'error'"
          class="text-xs font-medium text-danger"
        >
          ✗ {{ testStatus.google.message }}
        </span>
      </div>
    </template>

    <template v-if="visibleProviders.includes('groq')">
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
      <div class="-mt-2 mb-4 flex items-center gap-2">
        <BaseButton
          variant="ghost"
          size="sm"
          :loading="testStatus.groq.status === 'testing'"
          @click="runTest('groq')"
        >
          Test Connection
        </BaseButton>
        <span
          v-if="testStatus.groq.status === 'success'"
          class="text-xs font-medium text-primary"
        >
          ✓ {{ testStatus.groq.message }}
        </span>
        <span
          v-if="testStatus.groq.status === 'error'"
          class="text-xs font-medium text-danger"
        >
          ✗ {{ testStatus.groq.message }}
        </span>
      </div>
    </template>

    <template v-if="visibleProviders.includes('openrouter')">
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
      <div class="-mt-2 mb-4 flex items-center gap-2">
        <BaseButton
          variant="ghost"
          size="sm"
          :loading="testStatus.openrouter.status === 'testing'"
          @click="runTest('openrouter')"
        >
          Test Connection
        </BaseButton>
        <span
          v-if="testStatus.openrouter.status === 'success'"
          class="text-xs font-medium text-primary"
        >
          ✓ {{ testStatus.openrouter.message }}
        </span>
        <span
          v-if="testStatus.openrouter.status === 'error'"
          class="text-xs font-medium text-danger"
        >
          ✗ {{ testStatus.openrouter.message }}
        </span>
      </div>
    </template>

    <template v-if="visibleProviders.includes('aihubmix')">
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
      <div class="-mt-2 mb-4 flex items-center gap-2">
        <BaseButton
          variant="ghost"
          size="sm"
          :loading="testStatus.aihubmix.status === 'testing'"
          @click="runTest('aihubmix')"
        >
          Test Connection
        </BaseButton>
        <span
          v-if="testStatus.aihubmix.status === 'success'"
          class="text-xs font-medium text-primary"
        >
          ✓ {{ testStatus.aihubmix.message }}
        </span>
        <span
          v-if="testStatus.aihubmix.status === 'error'"
          class="text-xs font-medium text-danger"
        >
          ✗ {{ testStatus.aihubmix.message }}
        </span>
      </div>
    </template>

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
        class="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-background"
      >
        ✓ {{ aiConfigStatus }}
      </span>
    </div>
  </BaseCard>
</template>
