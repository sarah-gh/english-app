import { toRaw } from 'vue';
import type { Card, NewCard, PartOfSpeechEntry, PosType, QuizQuestion } from '@/types/card';

/** Form-editable mirror of PartOfSpeechEntry, with `ipa`/`examples` normalized to plain strings/arrays. */
export interface PosEntryFormState {
  id: string;
  pos: PosType;
  definition: string;
  ipa: string;
  examples: string[];
}

/**
 * UI-facing mirror of NewCard where every optional domain field is a plain string/array
 * instead of `T | undefined`, so form inputs can bind to it directly without type gymnastics.
 */
export interface CardFormState {
  frontTitle: string;
  backAnswer: string;
  deckId: string;
  tagIds: string[];
  ipa: string;
  ttsEnabled: boolean;
  audioBlob?: Blob;
  hint: string;
  examples: string[];
  quizQuestions: QuizQuestion[];
  partsOfSpeech: PosEntryFormState[];
  imageBlob?: Blob;
}

export function blankCardFormState(): CardFormState {
  return {
    frontTitle: '',
    backAnswer: '',
    deckId: '',
    tagIds: [],
    ipa: '',
    ttsEnabled: true,
    audioBlob: undefined,
    hint: '',
    examples: [],
    quizQuestions: [],
    partsOfSpeech: [],
    imageBlob: undefined,
  };
}

export function cardFormStateFromCard(card: Card): CardFormState {
  return {
    frontTitle: card.frontTitle,
    backAnswer: card.backAnswer,
    deckId: card.deckId,
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
      definition: entry.definition,
      ipa: entry.ipa ?? '',
      examples: entry.examples ? [...entry.examples] : [],
    })),
    imageBlob: card.imageBlob,
  };
}

/**
 * `state` is typically a Vue `reactive()` object — its nested arrays/objects are Proxy-wrapped,
 * and IndexedDB's structured-clone algorithm cannot store Proxies (throws DataCloneError).
 * `toRaw` unwraps back to the plain underlying data before it's handed to the repository.
 */
export function cardFormStateToNewCard(state: CardFormState): NewCard {
  const raw = toRaw(state);

  const partsOfSpeech: PartOfSpeechEntry[] = raw.partsOfSpeech
    .map((entry): PartOfSpeechEntry | null => {
      const definition = entry.definition.trim();
      if (!definition) return null;
      const examples = entry.examples.map((example) => example.trim()).filter(Boolean);
      return {
        id: entry.id,
        pos: entry.pos,
        definition,
        ipa: entry.ipa.trim() || undefined,
        examples: examples.length > 0 ? examples : undefined,
      };
    })
    .filter((entry): entry is PartOfSpeechEntry => entry !== null);

  return {
    frontTitle: raw.frontTitle.trim(),
    backAnswer: raw.backAnswer.trim(),
    deckId: raw.deckId,
    tagIds: [...raw.tagIds],
    ipa: raw.ipa.trim() || undefined,
    ttsEnabled: raw.ttsEnabled,
    audioBlob: raw.audioBlob,
    hint: raw.hint.trim() || undefined,
    examples: raw.examples.map((example) => example.trim()).filter(Boolean),
    quizQuestions: raw.quizQuestions
      .filter((question) => question.question.trim() && question.correctAnswer.trim())
      .map((question) => ({ ...question })),
    partsOfSpeech: partsOfSpeech.length > 0 ? partsOfSpeech : undefined,
    imageBlob: raw.imageBlob,
  };
}
