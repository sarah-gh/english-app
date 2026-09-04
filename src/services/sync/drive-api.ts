const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export const SYNC_FILENAME = 'flashcards_sync.json';

/** Thrown for any non-2xx Drive/userinfo response. `status` drives the 401-retry-once logic in
 *  the sync orchestrator — every other status is treated as non-retryable within a single sync. */
export class DriveApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
  }
}

/** Google occasionally answers with a bare 502/503/504 (or the connection drops outright) with no
 *  CORS headers on the error response at all, which the browser reports to `fetch` as an opaque
 *  network failure rather than a readable status — those are exactly the transient cases worth
 *  retrying, since the same request typically succeeds a moment later. */
const RETRYABLE_STATUSES = new Set([500, 502, 503, 504]);
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const REQUEST_TIMEOUT_MS = 20_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function driveFetch(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        signal: timeoutController.signal,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      });
    } catch {
      // Covers both a network-level fetch failure (offline, CORS-opaque 502) and our own abort
      // timeout — neither carries a usable status, so both retry the same way.
      if (attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new DriveApiError('Could not reach Google Drive.', 0);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      if (RETRYABLE_STATUSES.has(response.status) && attempt < RETRY_DELAYS_MS.length) {
        await delay(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw new DriveApiError(`Google Drive request failed (${response.status}).`, response.status);
    }
    return response;
  }

  // Unreachable — the loop above always returns or throws on its last iteration.
  throw new DriveApiError('Could not reach Google Drive.', 0);
}

export interface GoogleProfile {
  email?: string;
  name?: string;
  picture?: string;
}

export async function fetchUserProfile(token: string): Promise<GoogleProfile> {
  const response = await driveFetch(USERINFO_URL, token);
  return response.json();
}

/** Looks up `flashcards_sync.json` inside the app's private `appDataFolder` — that folder is
 *  invisible to the user and to every other app, so this query never collides with anything else
 *  in their Drive. Returns `null` on a first-ever sync, when the file doesn't exist yet. */
export async function findSyncFileId(token: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${SYNC_FILENAME}' and trashed=false`);
  const url = `${DRIVE_FILES_URL}?spaces=appDataFolder&q=${query}&fields=files(id)`;
  const response = await driveFetch(url, token);
  const data: { files?: Array<{ id: string }> } = await response.json();
  return data.files?.[0]?.id ?? null;
}

export async function downloadSyncFile<T>(token: string, fileId: string): Promise<T> {
  const response = await driveFetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, token);
  return response.json();
}

/** Multipart upload — the only way the Drive API accepts file metadata (name + parent folder)
 *  and content together in one request, which is required to create the file inside
 *  `appDataFolder` (a plain media upload has nowhere to say which folder it belongs in). */
export async function createSyncFile(token: string, payload: unknown): Promise<string> {
  const boundary = 'flashcards_sync_boundary';
  const metadata = JSON.stringify({ name: SYNC_FILENAME, parents: ['appDataFolder'] });
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n${JSON.stringify(payload)}\r\n` +
    `--${boundary}--`;

  const response = await driveFetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id`, token, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
  const data: { id: string } = await response.json();
  return data.id;
}

/** Plain media upload — replaces the existing file's content in place, no metadata change needed. */
export async function updateSyncFile(token: string, fileId: string, payload: unknown): Promise<void> {
  await driveFetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media`, token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

/** Permanently removes `flashcards_sync.json` from the appDataFolder. Drive returns an empty 204
 *  on success, so there's no body to parse. */
export async function deleteSyncFile(token: string, fileId: string): Promise<void> {
  await driveFetch(`${DRIVE_FILES_URL}/${fileId}`, token, { method: 'DELETE' });
}
