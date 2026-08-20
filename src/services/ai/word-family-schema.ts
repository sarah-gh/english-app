export interface GeneratedPOSDetail {
  word: string;
  meaning?: string;
  example?: string;
}

export interface GeneratedWordFamily {
  noun?: GeneratedPOSDetail;
  verb?: GeneratedPOSDetail;
  adjective?: GeneratedPOSDetail;
  adverb?: GeneratedPOSDetail;
  usageNotes?: string;
  /** IPA transcription of the root word, if applicable. */
  ipa?: string;
  suggestedTags: string[];
}

const POS_DETAIL_SCHEMA = {
  type: 'OBJECT',
  properties: {
    word: { type: 'STRING' },
    meaning: { type: 'STRING' },
    example: { type: 'STRING' },
  },
  required: ['word'],
};

/** Gemini Structured Output schema (also understood by AIHubMix's Gemini-compatible proxy). */
export const WORD_FAMILY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    noun: POS_DETAIL_SCHEMA,
    verb: POS_DETAIL_SCHEMA,
    adjective: POS_DETAIL_SCHEMA,
    adverb: POS_DETAIL_SCHEMA,
    usageNotes: { type: 'STRING' },
    ipa: { type: 'STRING' },
    suggestedTags: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['suggestedTags'],
};

/** OpenAI-compatible chat APIs (Groq, OpenRouter) don't support Gemini-style JSON Schema
 *  enforcement — their JSON mode only guarantees valid JSON, not a specific shape — so this gets
 *  appended to the prompt itself to describe the shape in words. */
export const WORD_FAMILY_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"noun": {"word": string, "meaning": string, "example": string} (optional), "verb": {...} (optional), "adjective": {...} (optional), "adverb": {...} (optional), "usageNotes": string (optional), "ipa": string (optional), "suggestedTags": string[]}`;

function isGeneratedPOSDetail(value: unknown): value is GeneratedPOSDetail {
  if (!value || typeof value !== 'object') return false;
  const detail = value as Record<string, unknown>;
  return (
    typeof detail.word === 'string' &&
    detail.word.trim().length > 0 &&
    (detail.meaning === undefined || typeof detail.meaning === 'string') &&
    (detail.example === undefined || typeof detail.example === 'string')
  );
}

function posDetail(value: unknown): GeneratedPOSDetail | undefined {
  if (!isGeneratedPOSDetail(value)) return undefined;
  return {
    word: value.word.trim(),
    meaning: typeof value.meaning === 'string' && value.meaning.trim() ? value.meaning.trim() : undefined,
    example: typeof value.example === 'string' && value.example.trim() ? value.example.trim() : undefined,
  };
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

/** Parses and validates a word-family JSON response body. Throws `makeError(message)` (so
 *  callers can raise a provider-specific error type) on any failure. */
export function parseWordFamilyResponseText(
  text: string | undefined,
  makeError: (message: string) => Error,
): GeneratedWordFamily {
  if (!text) throw makeError('The AI provider returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('The AI provider returned a response that was not valid JSON.');
  }

  const obj = parsed as Record<string, unknown>;
  const result: GeneratedWordFamily = {
    noun: posDetail(obj.noun),
    verb: posDetail(obj.verb),
    adjective: posDetail(obj.adjective),
    adverb: posDetail(obj.adverb),
    usageNotes: typeof obj.usageNotes === 'string' && obj.usageNotes.trim() ? obj.usageNotes.trim() : undefined,
    ipa: typeof obj.ipa === 'string' && obj.ipa.trim() ? obj.ipa.trim() : undefined,
    suggestedTags: stringArray(obj.suggestedTags),
  };

  if (!result.noun && !result.verb && !result.adjective && !result.adverb) {
    throw makeError('The AI provider did not return any usable word forms. Please try again.');
  }

  return result;
}
