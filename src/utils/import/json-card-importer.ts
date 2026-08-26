import type { PartOfSpeechEntry, POSDetail, PosType, WordFamilyData } from '@/types/card';

const DEFAULT_DECK_NAME = 'Imported';
/** Matches the fallback topic name `seedInitialDataIfNeeded()` gives every seed deck. */
const DEFAULT_TOPIC_NAME = 'General';
const VALID_POS_TYPES: PosType[] = ['noun', 'verb', 'adjective', 'adverb', 'other'];

/**
 * One card parsed out of the imported JSON, with every optional field defaulted so downstream
 * code never has to re-check for `undefined`. `sourceIndex` is this card's 1-based position among
 * all card-like entries found in the file, used to key preview rows and error messages.
 */
export interface ParsedImportCard {
  sourceIndex: number;
  frontTitle: string;
  backAnswer: string;
  deckName: string;
  topicName: string;
  ipa?: string;
  hint?: string;
  examples: string[];
  synonyms: string[];
  antonyms: string[];
  tagNames: string[];
  /** Ids are assigned at creation time (`crypto.randomUUID()`), same as `seedInitialDataIfNeeded()`. */
  partsOfSpeech?: Omit<PartOfSpeechEntry, 'id'>[];
  wordFamily?: WordFamilyData;
}

/** What already exists in the app, so the parser can tell which deck/topic/tag names in the file
 *  are new versus reused by a case-insensitive name match — the same resolve-or-create rule the
 *  Excel importer and card editor use. */
export interface JsonImportExistingData {
  deckNames: string[];
  tagNames: string[];
  /** Existing topic names for each deck, keyed by deck name (topics are deck-scoped, so the same
   *  topic name can be "new" under one deck and "existing" under another). */
  topicNamesByDeck: Record<string, string[]>;
}

export interface JsonImportValidationResult {
  isValid: boolean;
  validCardsCount: number;
  decksToCreate: string[];
  /** Formatted as `"<deck> › <topic>"` since topic names are only unique within their deck. */
  topicsToCreate: string[];
  tagsToCreate: string[];
  parsedCards: ParsedImportCard[];
  errors: string[];
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

/** Malformed entries are dropped individually rather than rejecting the whole list — mirrors
 *  `parsePartsOfSpeech` in the backup importer. */
function parsePartsOfSpeech(raw: unknown): Omit<PartOfSpeechEntry, 'id'>[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const entries = raw
    .map((item): Omit<PartOfSpeechEntry, 'id'> | null => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, unknown>;
      const definition = asString(entry.definition);
      if (typeof entry.pos !== 'string' || !VALID_POS_TYPES.includes(entry.pos as PosType) || !definition) {
        return null;
      }

      const examples = asStringArray(entry.examples);
      return {
        pos: entry.pos as PosType,
        wordForm: asString(entry.wordForm),
        definition,
        ipa: asString(entry.ipa),
        examples: examples.length > 0 ? examples : undefined,
      };
    })
    .filter((entry): entry is Omit<PartOfSpeechEntry, 'id'> => entry !== null);

  return entries.length > 0 ? entries : undefined;
}

function parsePosDetail(raw: unknown): POSDetail | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const detail = raw as Record<string, unknown>;
  const word = asString(detail.word);
  if (!word) return undefined;
  return { word, meaning: asString(detail.meaning), example: asString(detail.example) };
}

/** Requires a `rootWord` — a Word Family entry without one has nothing to anchor it, so it's
 *  dropped entirely rather than importing a blank shell. */
function parseWordFamily(raw: unknown): WordFamilyData | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const rootWord = asString(data.rootWord);
  if (!rootWord) return undefined;

  return {
    rootWord,
    noun: parsePosDetail(data.noun),
    verb: parsePosDetail(data.verb),
    adjective: parsePosDetail(data.adjective),
    adverb: parsePosDetail(data.adverb),
    usageNotes: asString(data.usageNotes),
  };
}

function parseCard(
  raw: unknown,
  sourceIndex: number,
  inheritedDeckName: string | undefined,
  inheritedTopicName: string | undefined,
  errors: string[],
): ParsedImportCard | null {
  if (!raw || typeof raw !== 'object') {
    errors.push(`Entry #${sourceIndex}: not a valid card object — skipped.`);
    return null;
  }

  const card = raw as Record<string, unknown>;
  const frontTitle = asString(card.frontTitle);
  const backAnswer = asString(card.backAnswer);

  if (!frontTitle) {
    errors.push(`Entry #${sourceIndex}: missing "frontTitle" — skipped.`);
    return null;
  }
  if (!backAnswer) {
    errors.push(`Entry #${sourceIndex} ("${frontTitle}"): missing "backAnswer" — skipped.`);
    return null;
  }

  return {
    sourceIndex,
    frontTitle,
    backAnswer,
    deckName: asString(card.deckName) ?? inheritedDeckName ?? DEFAULT_DECK_NAME,
    topicName: asString(card.topicName) ?? inheritedTopicName ?? DEFAULT_TOPIC_NAME,
    ipa: asString(card.ipa),
    hint: asString(card.hint),
    examples: asStringArray(card.examples),
    synonyms: asStringArray(card.synonyms),
    antonyms: asStringArray(card.antonyms),
    tagNames: asStringArray(card.tagNames),
    partsOfSpeech: parsePartsOfSpeech(card.partsOfSpeech),
    wordFamily: parseWordFamily(card.wordFamily),
  };
}

interface DeckGroup {
  deckName?: string;
  topicName?: string;
  cards: unknown[];
}

function looksLikeDeckGroup(value: unknown): value is Record<string, unknown> & { cards: unknown[] } {
  return Boolean(value) && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).cards);
}

function toDeckGroup(value: Record<string, unknown> & { cards: unknown[] }): DeckGroup {
  return {
    deckName: asString(value.name) ?? asString(value.deckName),
    topicName: asString(value.topicName),
    cards: value.cards,
  };
}

/**
 * Recognizes three JSON shapes: a flat array of cards (each free to set its own `deckName`), an
 * array of deck objects shaped like `SEED_DECKS` (`{ name, cards }`, optionally `topicName`), and
 * either of those wrapped in a `{ decks: [...] }` or `{ cards: [...] }` object. Returns `null` for
 * anything else.
 */
function extractDeckGroups(data: unknown): DeckGroup[] | null {
  if (Array.isArray(data)) {
    if (data.length === 0) return [{ cards: [] }];
    if (data.every(looksLikeDeckGroup)) return data.map(toDeckGroup);
    return [{ cards: data }];
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.decks)) {
      return obj.decks.map((item) => (looksLikeDeckGroup(item) ? toDeckGroup(item) : { cards: [] }));
    }
    if (Array.isArray(obj.cards)) return [{ cards: obj.cards }];
  }

  return null;
}

/**
 * Parses and validates a JSON card-import file's contents. Never throws — structural problems
 * (unparseable JSON, an unrecognized top-level shape) and per-card problems (missing required
 * fields) are both reported via `errors`/`isValid` rather than exceptions, so the caller can
 * always render a preview of whatever *did* parse.
 */
export function parseJsonCardImport(jsonText: string, existing: JsonImportExistingData): JsonImportValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(jsonText);
  } catch {
    return {
      isValid: false,
      validCardsCount: 0,
      decksToCreate: [],
      topicsToCreate: [],
      tagsToCreate: [],
      parsedCards: [],
      errors: ['This file is not valid JSON.'],
    };
  }

  const groups = extractDeckGroups(data);
  if (!groups) {
    return {
      isValid: false,
      validCardsCount: 0,
      decksToCreate: [],
      topicsToCreate: [],
      tagsToCreate: [],
      parsedCards: [],
      errors: [
        'Unrecognized JSON structure. Expected an array of cards, an array of decks (each with a ' +
          '"cards" list), or an object with a "decks" or "cards" key.',
      ],
    };
  }

  const errors: string[] = [];
  const parsedCards: ParsedImportCard[] = [];
  let sourceIndex = 0;
  for (const group of groups) {
    for (const rawCard of group.cards) {
      sourceIndex += 1;
      const parsed = parseCard(rawCard, sourceIndex, group.deckName, group.topicName, errors);
      if (parsed) parsedCards.push(parsed);
    }
  }
  if (sourceIndex === 0) errors.push('No cards were found in this file.');

  const existingDeckNames = new Set(existing.deckNames.map((name) => name.toLowerCase()));
  const existingTagNames = new Set(existing.tagNames.map((name) => name.toLowerCase()));
  const existingTopicsByDeck = new Map(
    Object.entries(existing.topicNamesByDeck).map(([deckName, topicNames]) => [
      deckName.toLowerCase(),
      new Set(topicNames.map((name) => name.toLowerCase())),
    ]),
  );

  const decksToCreate = new Set<string>();
  const topicsToCreate = new Set<string>();
  const tagsToCreate = new Set<string>();

  for (const card of parsedCards) {
    const isNewDeck = !existingDeckNames.has(card.deckName.toLowerCase());
    if (isNewDeck) decksToCreate.add(card.deckName);

    // A newly-created deck needs its topic created too, regardless of whether that topic name
    // happens to already exist under some OTHER deck — topics are scoped per-deck.
    const existingTopicsForDeck = existingTopicsByDeck.get(card.deckName.toLowerCase());
    const isNewTopic = isNewDeck || !existingTopicsForDeck?.has(card.topicName.toLowerCase());
    if (isNewTopic) topicsToCreate.add(`${card.deckName} › ${card.topicName}`);

    for (const tagName of card.tagNames) {
      if (!existingTagNames.has(tagName.toLowerCase())) tagsToCreate.add(tagName);
    }
  }

  return {
    isValid: parsedCards.length > 0,
    validCardsCount: parsedCards.length,
    decksToCreate: [...decksToCreate].sort((a, b) => a.localeCompare(b)),
    topicsToCreate: [...topicsToCreate].sort((a, b) => a.localeCompare(b)),
    tagsToCreate: [...tagsToCreate].sort((a, b) => a.localeCompare(b)),
    parsedCards,
    errors,
  };
}
