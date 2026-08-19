import { computed, ref } from 'vue';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'pwa-install-prompt-dismissed';

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayModeStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return displayModeStandalone || iosStandalone;
}

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const isStandalone = ref(detectStandalone());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt.value = event as BeforeInstallPromptEvent;
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt.value = null;
    isStandalone.value = true;
  });
}

/** Whether the browser has actually offered an installable prompt to capture. */
export const isInstallable = computed(() => deferredPrompt.value !== null);
export { isStandalone };

export function hasDismissedInstallPrompt(): boolean {
  return typeof localStorage !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === 'true';
}

export function dismissInstallPrompt(): void {
  localStorage.setItem(DISMISSED_KEY, 'true');
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const prompt = deferredPrompt.value;
  if (!prompt) return 'unavailable';

  await prompt.prompt();
  const choice = await prompt.userChoice;
  deferredPrompt.value = null;
  return choice.outcome;
}
