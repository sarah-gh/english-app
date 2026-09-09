import type { PosType } from '@/types/card';
import { sanitizeRichText, stripHtmlToText } from '@/utils/html';

export interface GeneratedPosEntry {
  pos: PosType;
  /** The specific spelling for this part of speech, the card's title itself when the spelling
   *  doesn't change for this part of speech (e.g. "Book" for both noun and verb), or the distinct
   *  form when it does (e.g. "Decision" for the noun form of "Decide"). The prompt and schema ask
   *  every provider to always include this, but it's typed optional since providers without real
   *  schema enforcement (Groq/OpenRouter) aren't guaranteed to comply, callers mapping this onto
   *  form state should fall back to the card's title when it's missing. */
  wordForm?: string;
  definition: string;
  ipa?: string;
  examples?: string[];
}

export interface GeneratedCardDetails {
  /** Concise HTML (<p>, <strong>, <em> only), sanitized down to that tag set by
   *  `parseCardAutofillResponseText` before it ever reaches the caller. Just a brief definition,
   *  primary translation, and one core example, extended context belongs in `extraInfo` instead. */
  backAnswer: string;
  /** Extended context kept separate from the concise `backAnswer`: verb forms/tenses, phrasal
   *  verbs, collocations, idiom notes, etc. Structured HTML (<h3>, <p>, <strong>, <em>,
   *  <ul>/<ol>/<li> section headings), sanitized the same way as `backAnswer`. Omitted when the
   *  AI found nothing worth adding beyond the concise answer. */
  extraInfo?: string;
  ipa?: string;
  hint?: string;
  /** Relatable, real-life example sentences, populates the card's own `examples` field (the
   *  editor's "Personal Examples" section) rather than being embedded in the `backAnswer`/
   *  `extraInfo` HTML. At least 2 for vocabulary/idioms, at least 3 (covering distinct usage
   *  structures) for grammar topics. */
  personalExamples: string[];
  /** Plain synonym words/phrases for the card's own `synonyms` field, deliberately kept out of
   *  the `backAnswer`/`extraInfo` HTML so the card never shows them twice. Empty when the term has
   *  no useful synonyms (most grammar topics). */
  synonyms: string[];
  /** Plain antonym words/phrases for the card's own `antonyms` field, same rationale as
   *  `synonyms`. Empty when nothing meaningfully opposes the term. */
  antonyms: string[];
  /** Present only when the title has more than one common part of speech worth distinguishing. */
  partsOfSpeech?: GeneratedPosEntry[];
  /** Plain tag names (no leading "#"), the caller resolves these to existing tags or creates
   *  new ones. */
  suggestedTags: string[];
  /** Best-fit deck/category name (e.g. "Vocabulary", "Idioms & Expressions", "Grammar"), only
   *  applied by the caller when the user hasn't already picked a deck. */
  suggestedDeckCategory?: string;
}

const POS_TYPES: PosType[] = ['noun', 'verb', 'adjective', 'adverb', 'other'];

/** Gemini Structured Output schema for a single parts-of-speech entry, shared between the
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
  required: ['pos', 'wordForm', 'definition'],
};

export const CARD_AUTOFILL_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    backAnswer: { type: 'STRING' },
    extraInfo: { type: 'STRING' },
    ipa: { type: 'STRING' },
    hint: { type: 'STRING' },
    personalExamples: { type: 'ARRAY', items: { type: 'STRING' } },
    synonyms: { type: 'ARRAY', items: { type: 'STRING' } },
    antonyms: { type: 'ARRAY', items: { type: 'STRING' } },
    partsOfSpeech: { type: 'ARRAY', items: POS_ENTRY_SCHEMA },
    suggestedTags: { type: 'ARRAY', items: { type: 'STRING' } },
    suggestedDeckCategory: { type: 'STRING' },
  },
  required: ['backAnswer', 'personalExamples', 'suggestedTags'],
};

/** OpenAI-compatible chat APIs (Groq, OpenRouter) don't support Gemini-style JSON Schema
 *  enforcement, their JSON mode only guarantees valid JSON, not a specific shape, so this gets
 *  appended to the prompt itself to describe the shape in words. */
export const CARD_AUTOFILL_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"backAnswer": string (concise HTML, <p>, <strong>, <em> only), "extraInfo": string (optional, structured HTML with <h3>, <p>, <strong>, <em>, <ul>/<ol>/<li> section headings; no other tags or attributes), "ipa": string (optional), "hint": string (optional), "personalExamples": string[], "synonyms": string[], "antonyms": string[], "partsOfSpeech": [{"pos": "noun" | "verb" | "adjective" | "adverb" | "other", "wordForm": string, "definition": string, "ipa": string (optional), "examples": string[] (optional)}] (optional), "suggestedTags": string[], "suggestedDeckCategory": string (optional)}`;

export function isGeneratedPosEntry(value: unknown): value is GeneratedPosEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.pos === 'string' &&
    // Case-insensitive: Gemini's schema `enum` guarantees the exact lowercase value, but
    // Groq/OpenRouter only get a prompt hint, no real schema enforcement, and commonly capitalize
    // it ("Noun" instead of "noun") despite the hint, which would otherwise silently drop every
    // entry. `sanitizeGeneratedPosEntry` normalizes the casing on the way out.
    POS_TYPES.includes(entry.pos.trim().toLowerCase() as PosType) &&
    typeof entry.definition === 'string' &&
    entry.definition.trim().length > 0 &&
    // Not all providers enforce the schema's `required: wordForm` (Groq/OpenRouter only get a
    // prompt hint, no real validation), stay lenient here so a compliant entry missing just this
    // one field isn't dropped wholesale; the caller falls back to the card's title instead.
    (entry.wordForm === undefined || typeof entry.wordForm === 'string') &&
    (entry.ipa === undefined || typeof entry.ipa === 'string') &&
    (entry.examples === undefined || Array.isArray(entry.examples))
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

/** Trims a structurally-valid `GeneratedPosEntry`'s string fields and drops any non-string or
 *  blank items from `examples`, rather than rejecting the whole entry over one malformed item
 *  (providers without real schema enforcement can mix stray non-string values into arrays). */
export function sanitizeGeneratedPosEntry(entry: GeneratedPosEntry): GeneratedPosEntry {
  return {
    pos: entry.pos.trim().toLowerCase() as PosType,
    wordForm: entry.wordForm?.trim() || undefined,
    definition: entry.definition.trim(),
    ipa: entry.ipa?.trim() || undefined,
    examples: entry.examples ? stringArray(entry.examples) : undefined,
  };
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
  if (typeof obj.backAnswer !== 'string' || !stripHtmlToText(obj.backAnswer)) {
    throw makeError("The AI provider's response did not include a usable definition.");
  }

  const partsOfSpeech = Array.isArray(obj.partsOfSpeech)
    ? obj.partsOfSpeech.filter(isGeneratedPosEntry).map(sanitizeGeneratedPosEntry)
    : undefined;

  return {
    backAnswer: sanitizeRichText(obj.backAnswer.trim()),
    extraInfo:
      typeof obj.extraInfo === 'string' && stripHtmlToText(obj.extraInfo)
        ? sanitizeRichText(obj.extraInfo.trim())
        : undefined,
    ipa: typeof obj.ipa === 'string' && obj.ipa.trim() ? obj.ipa.trim() : undefined,
    hint: typeof obj.hint === 'string' && obj.hint.trim() ? obj.hint.trim() : undefined,
    personalExamples: stringArray(obj.personalExamples),
    synonyms: stringArray(obj.synonyms),
    antonyms: stringArray(obj.antonyms),
    partsOfSpeech: partsOfSpeech && partsOfSpeech.length > 0 ? partsOfSpeech : undefined,
    suggestedTags: stringArray(obj.suggestedTags),
    suggestedDeckCategory:
      typeof obj.suggestedDeckCategory === 'string' && obj.suggestedDeckCategory.trim()
        ? obj.suggestedDeckCategory.trim()
        : undefined,
  };
}
