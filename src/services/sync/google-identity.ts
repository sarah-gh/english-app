import { SyncAuthError, type SyncAuthFailureReason } from '@/services/sync/types';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
/** `drive.appdata` is the actual sync storage; `email`/`profile` are only used to show who's
 *  connected (name/email/avatar) in the Cloud Sync settings card. */
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/drive.appdata email profile';

interface GoogleTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClientError {
  /** Non-OAuth failures GIS reports through `error_callback` rather than the token response —
   *  e.g. `'popup_failed_to_open'` when the browser's popup blocker refused the window (the
   *  common case for a call that isn't itself a direct user gesture), or `'popup_closed'` when
   *  the user was shown a popup and dismissed it. */
  type: string;
  message?: string;
}

interface GoogleTokenClient {
  callback: (response: GoogleTokenResponse) => void;
  error_callback?: (error: GoogleTokenClientError) => void;
  requestAccessToken: (options: { prompt: string }) => void;
}

interface GoogleAccountsOauth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
  }) => GoogleTokenClient;
  revoke: (token: string, callback: () => void) => void;
}

declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleAccountsOauth2 } };
  }
}

export interface AccessTokenResult {
  accessToken: string;
  /** Epoch ms. */
  expiresAt: number;
}

let scriptLoadPromise: Promise<void> | null = null;

/** Loads the GIS script once and caches the in-flight/settled promise. Call this eagerly (e.g. as
 *  soon as the Cloud Sync settings card mounts) rather than lazily on the Connect button's click —
 *  some browsers only treat a popup as user-initiated if it opens with no async gap after the
 *  click, and awaiting a `<script>` load first can be enough of a gap to trigger the popup blocker. */
export function loadGoogleIdentityScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoadPromise = null;
      reject(new SyncAuthError('Could not load Google Sign-In. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
}

let tokenClient: GoogleTokenClient | null = null;

/** Ceilings on how long to wait for GIS to answer before giving up (see the `settle` comment in
 *  `requestAccessToken`). The interactive budget has to cover a human actually signing in —
 *  picking an account, typing a password, clearing 2FA — so it's generous; a silent request either
 *  completes against the existing session almost immediately or not at all. */
const INTERACTIVE_TIMEOUT_MS = 120_000;
const SILENT_TIMEOUT_MS = 20_000;

async function getTokenClient(clientId: string): Promise<GoogleTokenClient> {
  await loadGoogleIdentityScript();
  if (!tokenClient) {
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: OAUTH_SCOPE,
      callback: () => {},
    });
  }
  return tokenClient;
}

/**
 * Requests a Drive `appdata` access token. `interactive: false` uses `prompt: 'none'` — GIS's
 * actual "never show any UI" contract (unlike `prompt: ''`, which is only guaranteed prompt-less
 * on a *first* request; `'none'` is documented to fail immediately with `interaction_required`
 * whenever it can't complete via the existing browser session, every time). `interactive: true`
 * uses `prompt: 'consent'`, showing the account/consent chooser — for the "Connect Google Drive"
 * action, or a fallback after a silent request the caller knows is still within a user gesture.
 *
 * Google's own guidance for this API is blunt about the limits here: "due to security concerns,
 * only the dialog UX is supported," and `requestAccessToken()` should be called "from a
 * user-driven event such as a button press." There's no hidden-iframe silent-renew mode the way
 * older Google Sign-In libraries had. In practice that means a `prompt: 'none'` call made outside
 * a user gesture (e.g. an automatic background sync) can itself get blocked by the browser's
 * popup blocker before GIS ever gets to attempt the silent check — reported here as
 * `'popup_blocked'`, not `'interaction_required'`. Both end up needing the same fix (a real click
 * from the user), so this is the practical ceiling on how invisible background refresh can be.
 */
export async function requestAccessToken(
  clientId: string,
  options: { interactive: boolean },
): Promise<AccessTokenResult> {
  const client = await getTokenClient(clientId);

  return new Promise((resolve, reject) => {
    // GIS's `callback`/`error_callback` are plain assignable properties on a client we reuse
    // across calls, and it guarantees nothing about firing exactly one of them exactly once. A
    // window closed in a way GIS doesn't observe fires neither, which would leave this promise
    // pending forever — and since `syncNow` awaits it behind the `isSyncing` flag, "forever" means
    // a sync spinner that never stops. `settle` collapses all three outcomes (success, reported
    // failure, no answer at all) into a single first-one-wins resolution.
    let settled = false;
    const settle = (apply: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      apply();
    };

    const timeoutId = setTimeout(
      () =>
        settle(() =>
          reject(new SyncAuthError('Google sign-in timed out. Please try again.', 'timeout')),
        ),
      options.interactive ? INTERACTIVE_TIMEOUT_MS : SILENT_TIMEOUT_MS,
    );

    client.callback = (response) => {
      settle(() => {
        if (response.error || !response.access_token) {
          const reason: SyncAuthFailureReason = response.error === 'interaction_required' ? 'interaction_required' : 'unknown';
          reject(
            new SyncAuthError(
              options.interactive
                ? 'Google sign-in was cancelled or failed.'
                : 'Your Google session needs to be refreshed.',
              reason,
            ),
          );
          return;
        }
        resolve({
          accessToken: response.access_token,
          expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
        });
      });
    };
    client.error_callback = (error) => {
      const reason: SyncAuthFailureReason =
        error.type === 'popup_failed_to_open' ? 'popup_blocked' : error.type === 'popup_closed' ? 'cancelled' : 'unknown';
      settle(() =>
        reject(
          new SyncAuthError(
            reason === 'popup_blocked'
              ? "Google sign-in couldn't open — check your browser's popup blocker."
              : 'Google sign-in was cancelled or failed.',
            reason,
          ),
        ),
      );
    };

    client.requestAccessToken({ prompt: options.interactive ? 'consent' : 'none' });
  });
}

export function revokeAccessToken(token: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.google?.accounts?.oauth2) {
      resolve();
      return;
    }
    window.google.accounts.oauth2.revoke(token, () => resolve());
  });
}
