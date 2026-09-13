import { interpolatePrompt, resolveActivePromptTemplate } from './prompt-registry';
import type { AppSettings } from '@/types/settings';

/**
 * Prompt builders for the per-field AI Auto-Fill buttons, each asks the AI to (re-)generate just
 * one section of a flashcard from its front title, leaving every other field untouched.
 */

export function buildDefinitionPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

STRICT LANGUAGE REQUIREMENT: every field you generate (backAnswer, extraInfo) MUST be written entirely in English. Never provide a Persian/Farsi translation or any other non-English text under any circumstances, regardless of the card's type, title, or grammar pattern.

Write an explanation of this term/topic, appropriate to what it is (a vocabulary word, a grammar point, an idiom, etc), split into a concise primary answer and a separate extended-info section. The card already has its own separate fields for example sentences, synonyms, and antonyms, so none of those may appear in the HTML you write here, the app renders them separately and repeating them duplicates content on the card.
- backAnswer: ONLY the core meaning, a brief, clear English definition or functional explanation (for a grammar structure or idiom, explain its usage context or grammatical function instead of a dictionary-style definition). Before writing it, silently identify the exact Part of Speech (Noun, Verb, Adjective, Adverb, etc.) of "${title}" as it is spelled, not the part of speech of a related root word. The English definition MUST match that exact part of speech, never substitute the meaning of a different word form (e.g. for the adjective "Ambitious", define it as an adjective — "having or showing a strong desire and determination to succeed" — never with the noun "ambition"'s meaning, "a strong desire to achieve something"). Two short sentences at most. No example sentences, no synonym or antonym lists, no extended notes, no translation into any other language. Never open by restating the term itself, no "${title} means …", no "${title}: …" prefix, start directly with the meaning or grammatical function (e.g. for "Intimidating", begin "Causing fear or nervousness in someone …"). The card's front already shows the term, so repeating it wastes the reader's first glance. This is the first thing shown on the back of the card during review, so it must be readable at a glance. Format this as clean HTML using only <p>, <strong>, <em> (never <script>, <style>, headings, lists, or any attributes), short prose, not a structured document.
- extraInfo: the deeper linguistic context that doesn't fit in the concise "backAnswer". Format this as clean, structured HTML using only these tags: <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li> (never <script>, <style>, or any attributes), one <h3> heading per section, <p> for prose, <ul>/<li> for lists. Cover whichever of these sections are genuinely useful for this term/topic:
  - "Usage Nuance & Register": formal vs. casual vs. neutral contexts, emotional tone and connotation, whether it's more common in speech or writing, and how strong/intense it sounds.
  - "Collocations & Preposition Patterns": the words and prepositions this term habitually combines with, shown as short patterns (e.g. "intimidated by someone").
  - "Verb Forms & Tenses" (verbs only): base, past simple, past participle, and -ing forms, explicitly flagging irregular forms.
  - "Phrasal Verbs & Preposition Patterns" (verbs only, when applicable): e.g. "take off", "look after", each with a brief meaning and how it's used.
  - "Common Pitfalls & Easily Confused Words": near-neighbour words learners mix this up with and precisely how they differ (e.g. how "intimidating" differs from "frightening" or "scary"), plus mistakes learners typically make with it.
  - "Cultural & Practical Context": when and where native speakers actually reach for this term in real life.
  - For Idioms & Expressions, also cover origin/etymology notes and how fixed or flexible the wording is. For Grammar topics, also cover the structures it contrasts with and the rules governing its use.
  Rules for extraInfo: never include a bare list of synonyms or antonyms, and never include standalone example sentences, those belong to the card's own dedicated fields. DO NOT include Word Family, Parts of Speech, or related word forms (noun/verb/adjective/adverb variants) here in any form, not as a heading, list, or passing mention, that information belongs exclusively in the card's dedicated "Parts of Speech" field, repeating it here duplicates the card. Contrasting a confusable word with an explanation of the difference is fine; short illustrative fragments inside a nuance explanation are fine; a list of similar words or a block of practice sentences is not. Omit any section with nothing meaningful to add, and omit "extraInfo" entirely only if there is genuinely nothing beyond the definition worth knowing.

Respond only with the structured fields requested.`;
}

export function buildExtraInfoPrompt(settings: AppSettings, front: string, back?: string): string {
  const contextClause = back?.trim()
    ? `The flashcard's front title/topic is: "${front}". Its back answer/explanation is: "${back.trim()}".`
    : `The flashcard's front title/topic is: "${front}".`;
  const userLevel = settings.proficiencyLevel ?? '';
  const userLevelHint = userLevel
    ? ` The learner's self-assessed English level is ${userLevel} (CEFR); keep vocabulary and explanations calibrated to that level.`
    : '';

  const template = resolveActivePromptTemplate(settings.customPrompts, 'EXTRA_INFO');
  return interpolatePrompt(template, {
    frontTitle: front,
    backAnswer: back?.trim() ?? '',
    contextClause,
    userLevel,
    userLevelHint,
  });
}

export function buildIpaPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Give the IPA phonetic transcription for this term, if it's a single word or short phrase with a standard pronunciation. Respond only with the IPA transcription itself, using standard IPA symbols only, no translation or other text.`;
}

export function buildExamplesPrompt(title: string, count: number): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Write ${count} relatable, real-life example sentences that use the term/topic the way an actual person would say it in conversation, texting, or everyday situations, never dry textbook sentences. Every sentence MUST be written entirely in English, never a Persian/Farsi translation or any other non-English text. Respond only with the structured field requested.`;
}

export function buildPartsOfSpeechPrompt(settings: AppSettings, title: string): string {
  const userLevel = settings.proficiencyLevel ?? '';
  const userLevelHint = userLevel
    ? ` The learner's self-assessed English level is ${userLevel} (CEFR); keep definitions and examples calibrated to that level.`
    : '';

  const template = resolveActivePromptTemplate(settings.customPrompts, 'PARTS_OF_SPEECH');
  return interpolatePrompt(template, {
    frontTitle: title,
    userLevel,
    userLevelHint,
  });
}
