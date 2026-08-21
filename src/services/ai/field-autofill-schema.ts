import { isGeneratedPosEntry, POS_ENTRY_SCHEMA, type GeneratedPosEntry } from './card-autofill-schema';

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

/** Gemini Structured Output schema (also understood by AIHubMix's Gemini-compatible proxy). */
export const DEFINITION_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { backAnswer: { type: 'STRING' } },
  required: ['backAnswer'],
};

/** OpenAI-compatible chat APIs (Groq, OpenRouter) don't support Gemini-style JSON Schema
 *  enforcement — their JSON mode only guarantees valid JSON, not a specific shape — so this gets
 *  appended to the prompt itself to describe the shape in words. */
export const DEFINITION_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"backAnswer": string}`;

export function parseDefinitionResponseText(text: string | undefined, makeError: (message: string) => Error): string {
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
  return obj.backAnswer.trim();
}

export const IPA_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { ipa: { type: 'STRING' } },
  required: ['ipa'],
};

export const IPA_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"ipa": string}`;

export function parseIpaResponseText(text: string | undefined, makeError: (message: string) => Error): string {
  if (!text) throw makeError('The AI provider returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('The AI provider returned a response that was not valid JSON.');
  }

  const obj = parsed as Record<string, unknown>;
  if (typeof obj.ipa !== 'string' || !obj.ipa.trim()) {
    throw makeError('The AI provider did not return a usable IPA transcription.');
  }
  return obj.ipa.trim();
}

export const EXAMPLES_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { examples: { type: 'ARRAY', items: { type: 'STRING' } } },
  required: ['examples'],
};

export const EXAMPLES_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"examples": string[]}`;

export function parseExamplesResponseText(text: string | undefined, makeError: (message: string) => Error): string[] {
  if (!text) throw makeError('The AI provider returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('The AI provider returned a response that was not valid JSON.');
  }

  const examples = stringArray((parsed as { examples?: unknown }).examples);
  if (examples.length === 0) {
    throw makeError('The AI provider did not return any usable examples. Please try again.');
  }
  return examples;
}

export const PARTS_OF_SPEECH_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: { partsOfSpeech: { type: 'ARRAY', items: POS_ENTRY_SCHEMA } },
  required: ['partsOfSpeech'],
};

export const PARTS_OF_SPEECH_JSON_SHAPE_HINT = `

Respond with ONLY a JSON object of this exact shape, no other text:
{"partsOfSpeech": [{"pos": "noun" | "verb" | "adjective" | "adverb" | "other", "wordForm": string (optional), "definition": string, "ipa": string (optional), "examples": string[] (optional)}]}`;

export function parsePartsOfSpeechResponseText(
  text: string | undefined,
  makeError: (message: string) => Error,
): GeneratedPosEntry[] {
  if (!text) throw makeError('The AI provider returned an empty response.');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw makeError('The AI provider returned a response that was not valid JSON.');
  }

  const partsOfSpeech = (parsed as { partsOfSpeech?: unknown }).partsOfSpeech;
  if (!Array.isArray(partsOfSpeech)) {
    throw makeError("The AI provider's response did not include a parts-of-speech list.");
  }

  const validEntries = partsOfSpeech.filter(isGeneratedPosEntry);
  if (validEntries.length === 0) {
    throw makeError('The AI provider did not find any distinct parts of speech for this word.');
  }
  return validEntries;
}
