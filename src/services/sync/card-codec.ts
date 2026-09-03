import { blobToDataUrl, dataUrlToBlob } from '@/services/sync/blob-codec';
import type { SyncCard } from '@/services/sync/types';
import type { Card } from '@/types/card';

export async function cardToSyncCard(card: Card): Promise<SyncCard> {
  const { audioBlob, imageBlob, ...rest } = card;
  return {
    ...rest,
    audioData: audioBlob ? await blobToDataUrl(audioBlob) : undefined,
    imageData: imageBlob ? await blobToDataUrl(imageBlob) : undefined,
  };
}

export async function syncCardToCard(syncCard: SyncCard): Promise<Card> {
  const { audioData, imageData, ...rest } = syncCard;
  return {
    ...rest,
    audioBlob: audioData ? await dataUrlToBlob(audioData) : undefined,
    imageBlob: imageData ? await dataUrlToBlob(imageData) : undefined,
  };
}
