/**
 * Prompt builders for the per-field AI Auto-Fill buttons — each asks the AI to (re-)generate just
 * one section of a flashcard from its front title/root word, leaving every other field untouched.
 * (Word Family generation reuses `buildWordFamilyAutofillPrompt` from `card-autofill-prompt-builder`
 * since it already produces exactly the "Word Family Forms" section on its own.)
 */

export function buildDefinitionPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Write a concise definition or explanation of this term/topic, appropriate to what it is (a vocabulary word, a grammar point, an idiom, etc). Respond only with the structured field requested.`;
}

export function buildIpaPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Give the IPA phonetic transcription for this term, if it's a single word or short phrase with a standard pronunciation. Respond only with the structured field requested.`;
}

export function buildExamplesPrompt(title: string, count: number): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Write ${count} relatable, real-life example sentences that use the term/topic the way an actual person would say it in conversation, texting, or everyday situations — never dry textbook sentences. Respond only with the structured field requested.`;
}

export function buildPartsOfSpeechPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

If this title is a single word with one or more common parts of speech, list them — one entry per part of speech, each with its own definition, IPA, and 1-2 examples. Always include wordForm: the exact spelling of that part of speech — use the title itself when the spelling doesn't change (e.g. wordForm "book" for both the noun and verb entries of "book"), or the distinct spelling when it does (e.g. wordForm "decision" for the noun form of "decide"). Never leave wordForm blank. If the title is a grammar topic, idiom, or phrase with no meaningful parts of speech, return an empty list. Respond only with the structured field requested.`;
}
