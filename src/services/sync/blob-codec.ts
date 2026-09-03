/** Encodes a Blob as a `data:` URL (base64 payload + its own MIME type) so it can travel inside
 *  the JSON sync payload — Google Drive's `appDataFolder` file is plain JSON, which can't hold
 *  binary data directly. */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read blob.'));
    reader.readAsDataURL(blob);
  });
}

/** Inverse of `blobToDataUrl` — `fetch()` on a `data:` URL decodes it back into a Blob without
 *  any manual base64 handling. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}
