import JSZip from 'jszip';
import { aiQuizResultRepository } from '@/db/repositories/ai-quiz-result-repository';
import { cardRepository } from '@/db/repositories/card-repository';
import { dailyStatRepository } from '@/db/repositories/daily-stat-repository';
import { deckRepository } from '@/db/repositories/deck-repository';
import { tagRepository } from '@/db/repositories/tag-repository';
import { topicRepository } from '@/db/repositories/topic-repository';
import type { AiQuizResult } from '@/types/ai-quiz-result';
import {
  DEFAULT_REVIEW_STATS,
  type Card,
  type CardReviewStats,
  type PartOfSpeechEntry,
  type POSDetail,
  type PosType,
  type QuizQuestion,
  type ReviewStatus,
  type WordFamilyData,
} from '@/types/card';
import type { DailyStat } from '@/types/daily-stat';
import type { Deck } from '@/types/deck';
import type { Tag } from '@/types/tag';
import type { Topic } from '@/types/topic';
import { mimeTypeForFilename } from '@/utils/mime';

export class BackupImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupImportError';
  }
}

export interface ImportSummary {
  decks: number;
  topics: number;
  tags: number;
  cards: number;
  aiQuizResults: number;
}

interface BackupManifest {
  version: number;
  decks: Deck[];
  topics?: Topic[];
  tags: Tag[];
  cards: Array<Record<string, unknown>>;
  aiQuizResults?: AiQuizResult[];
  dailyStats?: DailyStat[];
}

const VALID_STATUSES: ReviewStatus[] = ['new', 'easy', 'medium', 'hard'];
const VALID_POS_TYPES: PosType[] = ['noun', 'verb', 'adjective', 'adverb', 'other'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** Parses a card's `partsOfSpeech` from an archive that may predate this field (older backups),
 *  or predate the `wordForm` sub-field — malformed/incomplete entries are dropped individually
 *  rather than failing the whole card, so a partially-corrupt list doesn't lose the rest. */
function parsePartsOfSpeech(raw: unknown): PartOfSpeechEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const entries = raw
    .map((item): PartOfSpeechEntry | null => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, unknown>;
      if (!isNonEmptyString(entry.id) || !isNonEmptyString(entry.definition)) return null;
      if (!VALID_POS_TYPES.includes(entry.pos as PosType)) return null;

      return {
        id: entry.id,
        pos: entry.pos as PosType,
        wordForm: typeof entry.wordForm === 'string' ? entry.wordForm : undefined,
        definition: entry.definition,
        ipa: typeof entry.ipa === 'string' ? entry.ipa : undefined,
        examples: Array.isArray(entry.examples) ? (entry.examples as string[]) : undefined,
      };
    })
    .filter((entry): entry is PartOfSpeechEntry => entry !== null);

  return entries.length > 0 ? entries : undefined;
}

function parsePosDetail(raw: unknown): POSDetail | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const detail = raw as Record<string, unknown>;
  if (!isNonEmptyString(detail.word)) return undefined;

  return {
    word: detail.word,
    meaning: typeof detail.meaning === 'string' ? detail.meaning : undefined,
    example: typeof detail.example === 'string' ? detail.example : undefined,
  };
}

/** Parses a card's `wordFamily` from an archive that may predate this field entirely. */
function parseWordFamily(raw: unknown): WordFamilyData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  if (!isNonEmptyString(data.rootWord)) return undefined;

  return {
    rootWord: data.rootWord,
    noun: parsePosDetail(data.noun),
    verb: parsePosDetail(data.verb),
    adjective: parsePosDetail(data.adjective),
    adverb: parsePosDetail(data.adverb),
    usageNotes: typeof data.usageNotes === 'string' ? data.usageNotes : undefined,
  };
}

/** Parses a card's `reviewStats` from an archive that may predate this field entirely (v1
 *  backups) — falls back to zeroed stats rather than failing the card. */
function parseReviewStats(raw: unknown): CardReviewStats {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_REVIEW_STATS };
  const stats = raw as Record<string, unknown>;

  return {
    timesReviewed: typeof stats.timesReviewed === 'number' ? stats.timesReviewed : 0,
    lastReviewedAt: typeof stats.lastReviewedAt === 'number' ? stats.lastReviewedAt : undefined,
    successfulMatches: typeof stats.successfulMatches === 'number' ? stats.successfulMatches : 0,
    failedMatches: typeof stats.failedMatches === 'number' ? stats.failedMatches : 0,
  };
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
      topicId: typeof raw.topicId === 'string' ? raw.topicId : undefined,
      tagIds: Array.isArray(raw.tagIds) ? (raw.tagIds as string[]) : [],
      ipa: typeof raw.ipa === 'string' ? raw.ipa : undefined,
      ttsEnabled: Boolean(raw.ttsEnabled),
      audioBlob,
      hint: typeof raw.hint === 'string' ? raw.hint : undefined,
      examples: Array.isArray(raw.examples) ? (raw.examples as string[]) : [],
      synonyms: Array.isArray(raw.synonyms) ? (raw.synonyms as string[]) : [],
      antonyms: Array.isArray(raw.antonyms) ? (raw.antonyms as string[]) : [],
      quizQuestions: Array.isArray(raw.quizQuestions) ? (raw.quizQuestions as QuizQuestion[]) : [],
      partsOfSpeech: parsePartsOfSpeech(raw.partsOfSpeech),
      wordFamily: parseWordFamily(raw.wordFamily),
      imageBlob,
      reviewStatus: VALID_STATUSES.includes(raw.reviewStatus as ReviewStatus)
        ? (raw.reviewStatus as ReviewStatus)
        : 'new',
      reviewStats: parseReviewStats(raw.reviewStats),
      createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
    });
  }

  const topics = Array.isArray(manifest.topics) ? manifest.topics : [];
  const aiQuizResults = Array.isArray(manifest.aiQuizResults) ? manifest.aiQuizResults : [];
  const dailyStats = Array.isArray(manifest.dailyStats) ? manifest.dailyStats : [];

  await deckRepository.bulkPut(manifest.decks);
  await topicRepository.bulkPut(topics);
  await tagRepository.bulkPut(manifest.tags);
  await cardRepository.bulkPut(cards);
  await aiQuizResultRepository.bulkPut(aiQuizResults);
  await dailyStatRepository.bulkPut(dailyStats);

  return {
    decks: manifest.decks.length,
    topics: topics.length,
    tags: manifest.tags.length,
    cards: cards.length,
    aiQuizResults: aiQuizResults.length,
  };
}
