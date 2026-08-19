import JSZip from 'jszip';
import { cardRepository } from '@/db/repositories/card-repository';
import { deckRepository } from '@/db/repositories/deck-repository';
import { settingsRepository } from '@/db/repositories/settings-repository';
import { tagRepository } from '@/db/repositories/tag-repository';
import { extensionForMimeType } from '@/utils/mime';

const BACKUP_VERSION = 1;

/**
 * Bundles all decks, tags, and cards into data.json, moving each card's audio/image Blob
 * out into a media/ directory (JSON can't hold binary data) and leaving a relative path
 * reference in its place. The Gemini API key is intentionally never included — exporting
 * it would turn a shared backup file into a leaked credential.
 */
export async function exportBackup(): Promise<void> {
  const [cards, decks, tags, settings] = await Promise.all([
    cardRepository.getAll(),
    deckRepository.getAll(),
    tagRepository.getAll(),
    settingsRepository.get(),
  ]);

  const zip = new JSZip();
  // Valid folder-name strings always yield a JSZip instance, never null.
  const mediaAudio = zip.folder('media/audio')!;
  const mediaImages = zip.folder('media/images')!;

  const cardRecords = cards.map((card) => {
    const { audioBlob, imageBlob, ...rest } = card;
    const record: Record<string, unknown> = { ...rest };

    if (audioBlob) {
      const filename = `${card.id}.${extensionForMimeType(audioBlob.type, 'webm')}`;
      mediaAudio.file(filename, audioBlob);
      record.audioFile = `media/audio/${filename}`;
    }
    if (imageBlob) {
      const filename = `${card.id}.${extensionForMimeType(imageBlob.type, 'jpg')}`;
      mediaImages.file(filename, imageBlob);
      record.imageFile = `media/images/${filename}`;
    }

    return record;
  });

  const manifest = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    decks,
    tags,
    cards: cardRecords,
    settings: { speechAccent: settings.speechAccent },
  };

  zip.file('data.json', JSON.stringify(manifest, null, 2));

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `flashcards-backup-${dateStamp}.zip`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
