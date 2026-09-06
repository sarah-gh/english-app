import { blobToDataUrl, dataUrlToBlob } from '@/services/sync/blob-codec';
import type { SyncCard } from '@/services/sync/types';
import type { Card } from '@/types/card';

/**
 * Runs one media conversion, degrading to "no media" instead of failing.
 *
 * A single unreadable blob must never fail a whole sync. `syncNow` wraps everything in a catch-all
 * that maps any unrecognized error to `SyncOfflineError`, so one corrupt audio or image payload
 * used to surface to the user as "Sync failed. Changes saved locally.", a network problem they
 * don't actually have, and, because the bad record stays in the payload, every later sync failed
 * the same way with the same misleading message.
 *
 * Dropping just the media keeps the card itself, which is the part that carries the learning
 * content; the audio can be re-fetched or re-recorded, and the alternative is losing the card and
 * every other card alongside it.
 */
async function withoutMediaOnFailure<T>(
  convert: () => Promise<T>,
  description: string,
): Promise<T | undefined> {
  try {
    return await convert();
  } catch (error) {
    console.warn(`[card-codec] Dropping ${description} that could not be converted:`, error);
    return undefined;
  }
}

export async function cardToSyncCard(card: Card): Promise<SyncCard> {
  const { audioBlob, imageBlob, ...rest } = card;
  return {
    ...rest,
    audioData: audioBlob
      ? await withoutMediaOnFailure(() => blobToDataUrl(audioBlob), `audio for card ${card.id}`)
      : undefined,
    imageData: imageBlob
      ? await withoutMediaOnFailure(() => blobToDataUrl(imageBlob), `image for card ${card.id}`)
      : undefined,
  };
}

export async function syncCardToCard(syncCard: SyncCard): Promise<Card> {
  const { audioData, imageData, ...rest } = syncCard;
  return {
    ...rest,
    audioBlob: audioData
      ? await withoutMediaOnFailure(() => dataUrlToBlob(audioData), `audio for card ${syncCard.id}`)
      : undefined,
    imageBlob: imageData
      ? await withoutMediaOnFailure(() => dataUrlToBlob(imageData), `image for card ${syncCard.id}`)
      : undefined,
  };
}
