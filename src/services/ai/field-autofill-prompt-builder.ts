/**
 * Prompt builders for the per-field AI Auto-Fill buttons, each asks the AI to (re-)generate just
 * one section of a flashcard from its front title, leaving every other field untouched.
 */

export function buildDefinitionPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Write an explanation of this term/topic, appropriate to what it is (a vocabulary word, a grammar point, an idiom, etc), split into a concise primary answer and a separate extended-info section. The card already has its own separate fields for example sentences, synonyms, and antonyms, so none of those may appear in the HTML you write here, the app renders them separately and repeating them duplicates content on the card.
- backAnswer: ONLY the core meaning, a brief, clear English definition plus the primary Persian (Farsi) translation. Before writing it, silently identify the exact Part of Speech (Noun, Verb, Adjective, Adverb, etc.) of "${title}" as it is spelled, not the part of speech of a related root word. The English definition and the Persian translation MUST both match that exact part of speech, never substitute the meaning of a different word form (e.g. for the adjective "Ambitious", define it as an adjective — "having or showing a strong desire and determination to succeed" — and translate it with an adjective like "جاه‌طلب" or "جاه‌طلبانه", never with the noun "ambition"/"جاه‌طلبی" or "تمایل به موفقیت"). Two short sentences at most. No example sentences, no synonym or antonym lists, no extended notes. Never open by restating the term itself, no "${title} means …", no "${title}: …" prefix, start directly with the meaning or grammatical function (e.g. for "Intimidating", begin "Causing fear or nervousness in someone …"). The card's front already shows the term, so repeating it wastes the reader's first glance. This is the first thing shown on the back of the card during review, so it must be readable at a glance. Format this as clean HTML using only <p>, <strong>, <em> (never <script>, <style>, headings, lists, or any attributes), short prose, not a structured document.
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

export function buildExtraInfoPrompt(front: string, back?: string): string {
  const context = back?.trim()
    ? `The flashcard's front title/topic is: "${front}". Its back answer/explanation is: "${back.trim()}".`
    : `The flashcard's front title/topic is: "${front}".`;

  return `You are helping an English-language learner build a flashcard. ${context}

Write the "Extra Information" section: deeper linguistic context that wouldn't fit in a concise definition. The card has its own separate fields for example sentences, synonyms, and antonyms, so none of those may appear here, the app renders them separately and repeating them duplicates content on the card.

Format this as clean, structured HTML using only these tags: <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li> (never <script>, <style>, or any attributes), one <h3> heading per section, <p> for prose, <ul>/<li> for lists. Cover whichever of these sections are genuinely useful for this term/topic:
  - "Verb Forms & Tenses" (verbs only): base, past simple, past participle, and -ing forms, explicitly flagging irregular forms.
  - "Collocations & Preposition Patterns": the words and prepositions this term habitually combines with, shown as short patterns (e.g. "intimidated by someone").
  - "Usage Nuance & Register": formal vs. casual vs. neutral contexts, emotional tone and connotation, whether it's more common in speech or writing, and how strong/intense it sounds.
  - "Cultural & Practical Context": when and where native speakers actually reach for this term in real life, plus origin/etymology notes and how fixed or flexible the wording is for idioms and expressions.

Rules: never include a bare list of synonyms or antonyms, and never include standalone example sentences, those belong to the card's own dedicated fields. DO NOT include Word Family, Parts of Speech, or related word forms (noun/verb/adjective/adverb variants) here in any form, not as a heading, list, or passing mention, that information belongs exclusively in the card's dedicated "Parts of Speech" field, repeating it here duplicates the card. Contrasting a confusable word with an explanation of the difference is fine; short illustrative fragments inside a nuance explanation are fine; a list of similar words or a block of practice sentences is not. Omit any section with nothing meaningful to add.

Respond only with the structured field requested.`;
}

export function buildIpaPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Give the IPA phonetic transcription for this term, if it's a single word or short phrase with a standard pronunciation. Respond only with the structured field requested.`;
}

export function buildExamplesPrompt(title: string, count: number): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

Write ${count} relatable, real-life example sentences that use the term/topic the way an actual person would say it in conversation, texting, or everyday situations, never dry textbook sentences. Respond only with the structured field requested.`;
}

export function buildPartsOfSpeechPrompt(title: string): string {
  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".

If this title is a single vocabulary word, list every part of speech worth knowing about it. Cover both: (a) other grammatical uses of the title's own spelling (e.g. "book" as both noun and verb), and (b) closely related noun/verb/adjective/adverb forms with a different spelling (e.g. for "Intimidating": verb "intimidate", noun "intimidation", adverb "intimidatingly", alongside the adjective entry for "intimidating" itself). Always include an entry for the title's own exact part of speech. One entry per part of speech/form, each with its own definition, IPA, and 1-2 examples. Always include wordForm: the exact spelling of that part of speech, use the title itself when the spelling doesn't change (e.g. wordForm "book" for both the noun and verb entries of "book"), or the distinct spelling when it does (e.g. wordForm "decision" for the noun form of "decide"). Never leave wordForm blank. Each entry's "pos" and "definition" must describe that entry's own "wordForm" exactly as that specific part of speech, never the meaning of a different entry's word form (e.g. the "adjective" entry for "decisive" must be defined and translated as an adjective, not as the "noun" entry's "decision" meaning reused with a different label). If the title is a grammar topic, idiom, or fixed phrase with no meaningful parts of speech, return an empty list. Respond only with the structured field requested.`;
}
