import type { PosType } from '@/types/card';

export interface GeneratedPosEntry {
  pos: PosType;
  /** The specific spelling for this part of speech, only when it differs from the card's title
   *  (e.g. "Decision" for the noun form of "Decide"). */
  wordForm?: string;
  definition: string;
  ipa?: string;
  examples?: string[];
}

export interface GeneratedCardDetails {
  backAnswer: string;
  ipa?: string;
  hint?: string;
  /** Relatable, real-life example sentences — shown in the editor's "Personal Examples" section.
   *  At least 2 for vocabulary/idioms, at least 3 (covering distinct usage structures) for
   *  grammar topics. */
  personalExamples: string[];
  /** Present only when the title has more than one common part of speech worth distinguishing. */
  partsOfSpeech?: GeneratedPosEntry[];
  /** Plain tag names (no leading "#") — the caller resolves these to existing tags or creates
   *  new ones. */
  suggestedTags: string[];
  /** Best-fit deck/category name (e.g. "Vocabulary", "Idioms & Expressions", "Grammar") — only
   *  applied by the caller when the user hasn't already picked a deck. */
  suggestedDeckCategory?: string;
}

const POS_TYPES: PosType[] = ['noun', 'verb', 'adjective', 'adverb', 'other'];

/** Gemini Structured Output schema for a single parts-of-speech entry — shared between the
 *  full-card autofill schema below and the standalone per-field parts-of-speech endpoint. */
export const POS_ENTRY_SCHEMA = {
  type: 'OBJECT',
  properties: {
    pos: { type: 'STRING', enum: POS_TYPES },
    wordForm: { type: 'STRING' },
    definition: { type: 'STRING' },
    ipa: { type: 'STRING' },
    examples: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['pos', 'definition'],
};

export const CARD_AUTOFILL_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    backAnswer: { type: 'STRING' },
    ipa: { type: 'STRING' },
    hint: { type: 'STRING' },
    personalExamples: { type: 'ARRAY', items: { type: 'STRING' } },
    partsOfSpeech: { type: 'ARRAY', items: POS_ENTRY_SCHEMA },
    suggestedTags: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestedDeckCategory: { type: 'STRING' },
  },
  required: ['backAnswer', 'personalExamples', 'suggestedTags'],
};

/** OpenAI-compatible chat APIs (Groq, OpenRouter) don't support Gemini-style JSON Schema
 *  enforcement — their JSON mode only guarantees valid JSON, not a specific shape — so this gets
 *  appended to the prompt itself to describe the shape in words. */
export const CARD_AUTOFILL_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"backAnswer": string, "ipa": string (optional), "hint": string (optional), "personalExamples": string[], "partsOfSpeech": [{"pos": "noun" | "verb" | "adjective" | "adverb" | "other", "wordForm": string (optional), "definition": string, "ipa": string (optional), "examples": string[] (optional)}] (optional), "suggestedTags": string[], "suggestedDeckCategory": string (optional)}`;

export function isGeneratedPosEntry(value: unknown): value is GeneratedPosEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.pos === 'string' &&
    POS_TYPES.includes(entry.pos as PosType) &&
    typeof entry.definition === 'string' &&
    entry.definition.trim().length > 0 &&
    (entry.wordForm === undefined || typeof entry.wordForm === 'string') &&
    (entry.ipa === undefined || typeof entry.ipa === 'string') &&
    (entry.examples === undefined || Array.isArray(entry.examples))
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

/** Parses and validates a card-autofill JSON response body. Throws `makeError(message)` (so
 *  callers can raise a provider-specific error type) on any failure. */
export function parseCardAutofillResponseText(
  text: string | undefined,
  makeError: (message: string) => Error,
): GeneratedCardDetails {
  if (!text) throw makeError('The AI provider returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('The AI provider returned a response that was not valid JSON.');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.backAnswer !== 'string' || !obj.backAnswer.trim()) {
    throw makeError("The AI provider's response did not include a usable definition.");
  }

  const partsOfSpeech = Array.isArray(obj.partsOfSpeech)
    ? obj.partsOfSpeech.filter(isGeneratedPosEntry)
    : undefined;

  return {
    backAnswer: obj.backAnswer.trim(),
    ipa: typeof obj.ipa === 'string' && obj.ipa.trim() ? obj.ipa.trim() : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    personalExamples: stringArray(obj.personalExamples),
    partsOfSpeech: partsOfSpeech && partsOfSpeech.length > 0 ? partsOfSpeech : undefined,
    suggestedTags: stringArray(obj.suggestedTags),
    suggestedDeckCategory:
      typeof obj.suggestedDeckCategory === 'string' && obj.suggestedDeckCategory.trim()
        ? obj.suggestedDeckCategory.trim()
        : undefined,
  };
}
