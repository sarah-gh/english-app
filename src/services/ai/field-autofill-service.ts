import type { AppSettings } from '@/types/settings';
import { callAihubmixStructured } from './aihubmix-client';
import type { GeneratedPosEntry } from './card-autofill-schema';
import { AiProviderError } from './errors';
import {
  buildDefinitionPrompt,
  buildExamplesPrompt,
  buildExtraInfoPrompt,
  buildIpaPrompt,
  buildPartsOfSpeechPrompt,
} from './field-autofill-prompt-builder';
import {
  DEFINITION_JSON_SHAPE_HINT,
  DEFINITION_RESPONSE_SCHEMA,
  EXAMPLES_JSON_SHAPE_HINT,
  EXAMPLES_RESPONSE_SCHEMA,
  EXTRA_INFO_JSON_SHAPE_HINT,
  EXTRA_INFO_RESPONSE_SCHEMA,
  type GeneratedDefinition,
  IPA_JSON_SHAPE_HINT,
  IPA_RESPONSE_SCHEMA,
  parseDefinitionResponseText,
  parseExamplesResponseText,
  parseExtraInfoResponseText,
  parseIpaResponseText,
  parsePartsOfSpeechResponseText,
  PARTS_OF_SPEECH_JSON_SHAPE_HINT,
  PARTS_OF_SPEECH_RESPONSE_SCHEMA,
} from './field-autofill-schema';
import { callGoogleStructured } from './google-client';
import { callOpenAiCompatibleStructured } from './openai-compatible-client';
import { withProviderFallback } from './with-provider-fallback';

/** Runs one field-generation request against whichever provider(s) are configured in Settings.
 *  Reuses the same low-level `call*Structured` primitives the full-card autofill clients are
 *  built on, so adding a new targeted field here doesn't require touching every provider file,
 *  only a prompt, a response schema/parser, and one call to this helper. */
async function generateField<T>(
  settings: AppSettings,
  prompt: string,
  responseSchema: object,
  jsonShapeHint: string,
  parse: (text: string | undefined, makeError: (message: string) => Error) => T,
): Promise<T> {
  return withProviderFallback(settings, {
    google: async (apiKey) => {
      const text = await callGoogleStructured(apiKey, prompt, responseSchema);
      return parse(text, (message) => new AiProviderError('google', message, false));
    },
    groq: async (apiKey, baseUrl, model) => {
      const text = await callOpenAiCompatibleStructured(
        'groq',
        apiKey,
        baseUrl,
        model,
        prompt + jsonShapeHint,
      );
      return parse(text, (message) => new AiProviderError('groq', message, false));
    },
    openrouter: async (apiKey, baseUrl, model) => {
      const text = await callOpenAiCompatibleStructured(
        'openrouter',
        apiKey,
        baseUrl,
        model,
        prompt + jsonShapeHint,
      );
      return parse(text, (message) => new AiProviderError('openrouter', message, false));
    },
    aihubmix: async (apiKey, baseUrl) => {
      const text = await callAihubmixStructured(apiKey, baseUrl, prompt, responseSchema);
      return parse(text, (message) => new AiProviderError('aihubmix', message, false));
    },
  });
}

/** Generates the definition/back-answer field from the card's front title, split into the concise
 *  `backAnswer` and (when there's something worth adding) the extended `extraInfo` section. */
export async function generateDefinition(
  settings: AppSettings,
  title: string,
): Promise<GeneratedDefinition> {
  return generateField(
    settings,
    buildDefinitionPrompt(title),
    DEFINITION_RESPONSE_SCHEMA,
    DEFINITION_JSON_SHAPE_HINT,
    parseDefinitionResponseText,
  );
}

/** Generates just the "Extra Information" field, deeper linguistic context (verb forms, collocations,
 *  register/usage nuance, word family, cultural context), from the card's front title and, when
 *  available, its back answer/explanation for extra context. Never touches any other field. */
export async function generateExtraInfo(
  settings: AppSettings,
  front: string,
  back?: string,
): Promise<string> {
  return generateField(
    settings,
    buildExtraInfoPrompt(front, back),
    EXTRA_INFO_RESPONSE_SCHEMA,
    EXTRA_INFO_JSON_SHAPE_HINT,
    parseExtraInfoResponseText,
  );
}

/** Generates just the IPA pronunciation field from the card's front title. */
export async function generateIPA(settings: AppSettings, title: string): Promise<string> {
  return generateField(
    settings,
    buildIpaPrompt(title),
    IPA_RESPONSE_SCHEMA,
    IPA_JSON_SHAPE_HINT,
    parseIpaResponseText,
  );
}

/** Generates just the Personal Examples list from the card's front title. */
export async function generateExamples(
  settings: AppSettings,
  title: string,
  count: number,
): Promise<string[]> {
  return generateField(
    settings,
    buildExamplesPrompt(title, count),
    EXAMPLES_RESPONSE_SCHEMA,
    EXAMPLES_JSON_SHAPE_HINT,
    parseExamplesResponseText,
  );
}

/** Generates just the Parts of Speech block from the card's front title. */
export async function generatePartsOfSpeech(
  settings: AppSettings,
  title: string,
): Promise<GeneratedPosEntry[]> {
  return generateField(
    settings,
    buildPartsOfSpeechPrompt(title),
    PARTS_OF_SPEECH_RESPONSE_SCHEMA,
    PARTS_OF_SPEECH_JSON_SHAPE_HINT,
    parsePartsOfSpeechResponseText,
  );
}
