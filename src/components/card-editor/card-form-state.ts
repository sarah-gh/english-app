import { toRaw } from 'vue';
import type { Card, NewCard, PartOfSpeechEntry, POSDetail, PosType, QuizQuestion, WordFamilyData } from '@/types/card';

/** Form-editable mirror of PartOfSpeechEntry, with `ipa`/`examples`/`wordForm` normalized to plain
 *  strings/arrays. */
export interface PosEntryFormState {
  id: string;
  pos: PosType;
  wordForm: string;
  definition: string;
  ipa: string;
  examples: string[];
}

export type CardMode = 'standard' | 'word-family';

/** Form-editable mirror of POSDetail, with every field a plain (possibly empty) string. */
export interface POSDetailFormState {
  word: string;
  meaning: string;
  example: string;
}

/** Form-editable mirror of WordFamilyData. `rootWord` is kept in sync with `frontTitle` rather
 *  than edited separately — the root word IS the card's front title in Word Family mode. */
export interface WordFamilyFormState {
  noun: POSDetailFormState;
  verb: POSDetailFormState;
  adjective: POSDetailFormState;
  adverb: POSDetailFormState;
  usageNotes: string;
}

function blankPosDetailFormState(): POSDetailFormState {
  return { word: '', meaning: '', example: '' };
}

export function blankWordFamilyFormState(): WordFamilyFormState {
  return {
    noun: blankPosDetailFormState(),
    verb: blankPosDetailFormState(),
    adjective: blankPosDetailFormState(),
    adverb: blankPosDetailFormState(),
    usageNotes: '',
  };
}

function posDetailFormStateFrom(detail: POSDetail | undefined): POSDetailFormState {
  if (!detail) return blankPosDetailFormState();
  return { word: detail.word, meaning: detail.meaning ?? '', example: detail.example ?? '' };
}

/**
 * UI-facing mirror of NewCard where every optional domain field is a plain string/array
 * instead of `T | undefined`, so form inputs can bind to it directly without type gymnastics.
 */
export interface CardFormState {
  cardMode: CardMode;
  frontTitle: string;
  backAnswer: string;
  deckId: string;
  topicId: string;
  tagIds: string[];
  ipa: string;
  ttsEnabled: boolean;
  audioBlob?: Blob;
  hint: string;
  examples: string[];
  quizQuestions: QuizQuestion[];
  partsOfSpeech: PosEntryFormState[];
  wordFamily: WordFamilyFormState;
  imageBlob?: Blob;
}

export function blankCardFormState(): CardFormState {
  return {
    cardMode: 'standard',
    frontTitle: '',
    backAnswer: '',
    deckId: '',
    topicId: '',
    tagIds: [],
    ipa: '',
    ttsEnabled: true,
    audioBlob: undefined,
    hint: '',
    examples: [],
    quizQuestions: [],
    partsOfSpeech: [],
    wordFamily: blankWordFamilyFormState(),
    imageBlob: undefined,
  };
}

export function cardFormStateFromCard(card: Card): CardFormState {
  return {
    cardMode: card.wordFamily ? 'word-family' : 'standard',
    frontTitle: card.frontTitle,
    backAnswer: card.backAnswer,
    deckId: card.deckId,
    topicId: card.topicId ?? '',
    tagIds: [...card.tagIds],
    ipa: card.ipa ?? '',
    ttsEnabled: card.ttsEnabled,
    audioBlob: card.audioBlob,
    hint: card.hint ?? '',
    examples: [...card.examples],
    quizQuestions: card.quizQuestions.map((question) => ({ ...question })),
    partsOfSpeech: (card.partsOfSpeech ?? []).map((entry) => ({
      id: entry.id,
      pos: entry.pos,
      wordForm: entry.wordForm ?? '',
      definition: entry.definition,
      ipa: entry.ipa ?? '',
      examples: entry.examples ? [...entry.examples] : [],
    })),
    wordFamily: card.wordFamily
      ? {
          noun: posDetailFormStateFrom(card.wordFamily.noun),
          verb: posDetailFormStateFrom(card.wordFamily.verb),
          adjective: posDetailFormStateFrom(card.wordFamily.adjective),
          adverb: posDetailFormStateFrom(card.wordFamily.adverb),
          usageNotes: card.wordFamily.usageNotes ?? '',
        }
      : blankWordFamilyFormState(),
    imageBlob: card.imageBlob,
  };
}

function posDetailFrom(detail: POSDetailFormState): POSDetail | undefined {
  const word = detail.word.trim();
  if (!word) return undefined;
  return {
    word,
    meaning: detail.meaning.trim() || undefined,
    example: detail.example.trim() || undefined,
  };
}

const POS_LABELS = { noun: 'Noun', verb: 'Verb', adjective: 'Adjective', adverb: 'Adverb' } as const;

/** A word-family card still needs a non-empty `backAnswer` (every other feature — search, quiz
 *  generation prompts — reads it unconditionally), so it's derived from whichever forms were
 *  filled in rather than shown as its own editable field. */
function summarizeWordFamily(rootWord: string, wordFamily: WordFamilyData): string {
  const parts = (Object.keys(POS_LABELS) as Array<keyof typeof POS_LABELS>)
    .map((pos) => {
      const detail = wordFamily[pos];
      if (!detail) return null;
      return `${POS_LABELS[pos]}: ${detail.word}${detail.meaning ? ` — ${detail.meaning}` : ''}`;
    })
    .filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join('; ') : `Word family for "${rootWord}".`;
}

/**
 * `state` is typically a Vue `reactive()` object — its nested arrays/objects are Proxy-wrapped,
 * and IndexedDB's structured-clone algorithm cannot store Proxies (throws DataCloneError).
 * `toRaw` unwraps back to the plain underlying data before it's handed to the repository.
 */
export function cardFormStateToNewCard(state: CardFormState): NewCard {
  const raw = toRaw(state);
  const frontTitle = raw.frontTitle.trim();

  const partsOfSpeech: PartOfSpeechEntry[] = raw.partsOfSpeech
    .map((entry): PartOfSpeechEntry | null => {
      const definition = entry.definition.trim();
      if (!definition) return null;
      const examples = entry.examples.map((example) => example.trim()).filter(Boolean);
      return {
        id: entry.id,
        pos: entry.pos,
        wordForm: entry.wordForm.trim() || undefined,
        definition,
        ipa: entry.ipa.trim() || undefined,
        examples: examples.length > 0 ? examples : undefined,
      };
    })
    .filter((entry): entry is PartOfSpeechEntry => entry !== null);

  let wordFamily: WordFamilyData | undefined;
  let backAnswer = raw.backAnswer.trim();
  if (raw.cardMode === 'word-family') {
    wordFamily = {
      rootWord: frontTitle,
      noun: posDetailFrom(raw.wordFamily.noun),
      verb: posDetailFrom(raw.wordFamily.verb),
      adjective: posDetailFrom(raw.wordFamily.adjective),
      adverb: posDetailFrom(raw.wordFamily.adverb),
      usageNotes: raw.wordFamily.usageNotes.trim() || undefined,
    };
    backAnswer = summarizeWordFamily(frontTitle, wordFamily);
  }

  return {
    frontTitle,
    backAnswer,
    deckId: raw.deckId,
    topicId: raw.topicId || undefined,
    tagIds: [...raw.tagIds],
    ipa: raw.ipa.trim() || undefined,
    ttsEnabled: raw.ttsEnabled,
    audioBlob: raw.audioBlob,
    hint: raw.hint.trim() || undefined,
    examples: raw.examples.map((example) => example.trim()).filter(Boolean),
    quizQuestions: raw.quizQuestions
      .filter((question) => question.question.trim() && question.correctAnswer.trim())
      .map((question) => ({ ...question })),
    partsOfSpeech:
      raw.cardMode === 'word-family' ? undefined : partsOfSpeech.length > 0 ? partsOfSpeech : undefined,
    wordFamily,
    imageBlob: raw.imageBlob,
  };
}
