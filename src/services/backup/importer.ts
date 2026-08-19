import JSZip from 'jszip';
import { cardRepository } from '@/db/repositories/card-repository';
import { deckRepository } from '@/db/repositories/deck-repository';
import { tagRepository } from '@/db/repositories/tag-repository';
import type { Card, QuizQuestion, ReviewStatus } from '@/types/card';
import type { Deck } from '@/types/deck';
import type { Tag } from '@/types/tag';
import { mimeTypeForFilename } from '@/utils/mime';

export class BackupImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupImportError';
  }
}

export interface ImportSummary {
  decks: number;
  tags: number;
  cards: number;
}

interface BackupManifest {
  version: number;
  decks: Deck[];
  tags: Tag[];
  cards: Array<Record<string, unknown>>;
}

const VALID_STATUSES: ReviewStatus[] = ['new', 'easy', 'medium', 'hard'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Throws a clear, user-facing error the moment the archive's data doesn't look right. */
function validateManifest(data: unknown): asserts data is BackupManifest {
  if (!data || typeof data !== 'object') {
    throw new BackupImportError('data.json is not a valid backup file.');
  }
  const manifest = data as Record<string, unknown>;

  if (typeof manifest.version !== 'number') {
    throw new BackupImportError('data.json is missing a version number.');
  }
  if (!Array.isArray(manifest.decks)) {
    throw new BackupImportError('data.json is missing its decks list.');
  }
  if (!Array.isArray(manifest.tags)) {
    throw new BackupImportError('data.json is missing its tags list.');
  }
  if (!Array.isArray(manifest.cards)) {
    throw new BackupImportError('data.json is missing its cards list.');
  }

  for (const deck of manifest.decks as Record<string, unknown>[]) {
    if (!isNonEmptyString(deck.id) || !isNonEmptyString(deck.name)) {
      throw new BackupImportError('One or more decks are missing an id or name.');
    }
  }
  for (const tag of manifest.tags as Record<string, unknown>[]) {
    if (!isNonEmptyString(tag.id) || !isNonEmptyString(tag.name) || !isNonEmptyString(tag.color)) {
      throw new BackupImportError('One or more tags are missing an id, name, or color.');
    }
  }
  for (const card of manifest.cards as Record<string, unknown>[]) {
    if (!isNonEmptyString(card.id) || !isNonEmptyString(card.frontTitle) || !isNonEmptyString(card.deckId)) {
      throw new BackupImportError('One or more cards are missing required fields.');
    }
  }
}

/**
 * Restores/merges a .zip produced by exportBackup(). Records use `bulkPut`, which upserts by
 * id — since ids are UUIDs, importing the same backup twice is idempotent, importing onto a
 * fresh device is a pure insert, and importing alongside existing local data merges the two,
 * only overwriting records that share an id with the archive.
 */
export async function importBackup(file: File): Promise<ImportSummary> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new BackupImportError('This file is not a valid .zip archive.');
  }

  const dataEntry = zip.file('data.json');
  if (!dataEntry) {
    throw new BackupImportError('data.json was not found inside the archive.');
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(await dataEntry.async('string'));
  } catch {
    throw new BackupImportError('data.json could not be parsed as JSON.');
  }

  validateManifest(manifest);

  const cards: Card[] = [];
  for (const raw of manifest.cards) {
    let audioBlob: Blob | undefined;
    let imageBlob: Blob | undefined;

    if (isNonEmptyString(raw.audioFile)) {
      const entry = zip.file(raw.audioFile);
      if (entry) {
        const buffer = await entry.async('arraybuffer');
        audioBlob = new Blob([buffer], { type: mimeTypeForFilename(raw.audioFile, 'audio/webm') });
      }
    }
    if (isNonEmptyString(raw.imageFile)) {
      const entry = zip.file(raw.imageFile);
      if (entry) {
        const buffer = await entry.async('arraybuffer');
        imageBlob = new Blob([buffer], { type: mimeTypeForFilename(raw.imageFile, 'image/jpeg') });
      }
    }

    cards.push({
      id: raw.id as string,
      frontTitle: raw.frontTitle as string,
      backAnswer: typeof raw.backAnswer === 'string' ? raw.backAnswer : '',
      deckId: raw.deckId as string,
      tagIds: Array.isArray(raw.tagIds) ? (raw.tagIds as string[]) : [],
      ipa: typeof raw.ipa === 'string' ? raw.ipa : undefined,
      ttsEnabled: Boolean(raw.ttsEnabled),
      audioBlob,
      hint: typeof raw.hint === 'string' ? raw.hint : undefined,
      examples: Array.isArray(raw.examples) ? (raw.examples as string[]) : [],
      quizQuestions: Array.isArray(raw.quizQuestions) ? (raw.quizQuestions as QuizQuestion[]) : [],
      imageBlob,
      reviewStatus: VALID_STATUSES.includes(raw.reviewStatus as ReviewStatus)
        ? (raw.reviewStatus as ReviewStatus)
        : 'new',
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    });
  }

  await deckRepository.bulkPut(manifest.decks);
  await tagRepository.bulkPut(manifest.tags);
  await cardRepository.bulkPut(cards);

  return { decks: manifest.decks.length, tags: manifest.tags.length, cards: cards.length };
}
