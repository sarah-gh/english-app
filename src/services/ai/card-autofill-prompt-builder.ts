/**
 * Builds a prompt asking the AI to fill in every remaining field of a flashcard from just its
 * front title (and, if picked, the deck it's going into as a topic hint).
 */
export function buildCardAutofillPrompt(title: string, deckName?: string): string {
  const topicHint = deckName
    ? ` The card is going into the "${deckName}" deck — use that as a hint for the topic.`
    : '';

  return `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "${title}".${topicHint}

First, silently classify the topic into exactly one category: "Vocabulary" (a single word or short phrase), "Idioms & Expressions" (an idiom, phrasal verb, or fixed expression), or "Grammar" (a grammar point, tense, or structure). Use this classification to guide the fields below.

Every piece of content belongs in exactly ONE field. Example sentences, synonyms, and antonyms each have their own dedicated field below and must NEVER also appear inside the "backAnswer" or "extraInfo" HTML — the app renders those fields separately, so repeating them there duplicates content on the card.

Generate the back-side content for this flashcard:
- backAnswer: ONLY the core meaning — a brief, clear English definition plus the primary Persian (Farsi) translation. Two short sentences at most. No example sentences, no synonym or antonym lists, no extended notes. Never open by restating the term itself — no "${title} means …", no "${title}: …" prefix — start directly with the meaning or grammatical function (e.g. for "Intimidating", begin "Causing fear or nervousness in someone …"). The card's front already shows the term, so repeating it wastes the reader's first glance. This is the first thing shown on the back of the card during review, so it must be readable at a glance. Format this as clean HTML using only <p>, <strong>, <em> (never <script>, <style>, headings, lists, or any attributes) — short prose, not a structured document.
- extraInfo: the deeper linguistic context that doesn't fit in the concise "backAnswer". Format this as clean, structured HTML using only these tags: <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li> (never <script>, <style>, or any attributes) — one <h3> heading per section, <p> for prose, <ul>/<li> for lists. Cover whichever of these sections are genuinely useful for this term/topic:
  - "Usage Nuance & Register": formal vs. casual vs. neutral contexts, emotional tone and connotation, whether it's more common in speech or writing, and how strong/intense it sounds.
  - "Collocations & Preposition Patterns": the words and prepositions this term habitually combines with, shown as short patterns (e.g. "intimidated by someone").
  - "Verb Forms & Tenses" (verbs only): base, past simple, past participle, and -ing forms, explicitly flagging irregular forms.
  - "Phrasal Verbs & Preposition Patterns" (verbs only, when applicable): e.g. "take off", "look after", each with a brief meaning and how it's used.
  - "Word Family & Related Forms": the related noun/verb/adjective/adverb forms and how each is used (e.g. verb "intimidate", noun "intimidation", adjective "intimidating", adverb "intimidatingly").
  - "Common Pitfalls & Easily Confused Words": near-neighbour words learners mix this up with and precisely how they differ (e.g. how "intimidating" differs from "frightening" or "scary"), plus mistakes learners typically make with it.
  - "Cultural & Practical Context": when and where native speakers actually reach for this term in real life.
  - For Idioms & Expressions, also cover origin/etymology notes and how fixed or flexible the wording is. For Grammar topics, also cover the structures it contrasts with and the rules governing its use.
  Rules for extraInfo: never include a bare list of synonyms or antonyms, and never include standalone example sentences — those belong in the dedicated fields below. Contrasting a confusable word with an explanation of the difference is fine; short illustrative fragments inside a nuance explanation are fine; a list of similar words or a block of practice sentences is not. Omit any section with nothing meaningful to add, and omit "extraInfo" entirely only if there is genuinely nothing beyond the definition worth knowing.
- ipa: the IPA phonetic transcription, only if the title is a single word or short phrase with a standard pronunciation — omit it otherwise (e.g. for grammar topics like "Present Perfect Tense").
- hint: a short, helpful memory cue — this is hidden until tapped during review, so it should nudge recall without giving the answer away outright.
- personalExamples: relatable, real-life example sentences that use the term/topic the way an actual person would say it in conversation, texting, or everyday situations — never dry textbook sentences. Plain sentence strings, with no HTML and no surrounding quotes.
  - For Vocabulary or Idioms & Expressions: at least 2 example sentences.
  - For Grammar: at least 3 example sentences that each demonstrate a different usage structure of the topic (e.g. affirmative, negative, and question forms, or other distinct patterns the topic supports).
- synonyms: 3-5 words or short phrases meaning roughly the same thing, as plain strings (e.g. ["frightening", "daunting"]) — no HTML, no bullets, no explanations. Return an empty list when the term genuinely has no useful synonyms (most grammar topics).
- antonyms: 2-5 opposites in the same plain-string form (e.g. ["reassuring", "comforting", "encouraging"]). Return an empty list when nothing meaningfully opposes the term.
- partsOfSpeech: only if the title is a single word with more than one common part of speech worth distinguishing (e.g. "book" as both noun and verb, or "decide" whose noun form is spelled "decision") — one entry per part of speech, each with its own definition, IPA, and 1-2 examples. Always include wordForm: the exact spelling of that part of speech — use the title itself when the spelling doesn't change (e.g. wordForm "book" for both the noun and verb entries of "book"), or the distinct spelling when it does (e.g. wordForm "decision" for the noun form of "decide"). Never leave wordForm blank. Omit partsOfSpeech entirely (or leave empty) for grammar topics, idioms, phrases, or single-part-of-speech words.
- suggestedTags: 2-3 short, relevant tag names (e.g. "B2", "Verbs", "Business", "Idioms") — plain words, no leading "#".
- suggestedDeckCategory: the category name you classified above ("Vocabulary", "Idioms & Expressions", or "Grammar") — always include this even if a deck was already hinted above.

Respond only with the structured fields requested.`;
}

/**
 * Builds a prompt asking the AI to fill in a "Word Family" card from just its root word — the
 * Noun/Verb/Adjective/Adverb forms, a Persian meaning and example sentence for each, and any
 * usage nuance between them.
 */
export function buildWordFamilyAutofillPrompt(rootWord: string): string {
  return `You are helping an English-language learner whose native language is Persian (Farsi) build a "Word Family" flashcard for the root word "${rootWord}".

Provide the Noun, Verb, Adjective, and Adverb forms of this root word (e.g. for "Success": noun "Success", verb "Succeed", adjective "Successful", adverb "Successfully"). For each part of speech that naturally exists for this root word, provide:
- word: the actual word form (e.g. "Successful").
- meaning: a concise Persian (Farsi) translation or meaning of that specific word form.
- example: one natural English example sentence using that word form.

If a particular part of speech doesn't naturally exist for this root word, omit it entirely rather than inventing one.

Also provide:
- usageNotes: 1-2 sentences in English clarifying any nuance in how these forms are used differently, if there's anything non-obvious worth noting. Omit if there isn't.
- ipa: the IPA phonetic transcription of the root word, if it has a standard pronunciation.
- suggestedTags: 2-3 short, relevant tag names (e.g. "B2", "Word Families") — plain words, no leading "#".

Respond only with the structured fields requested.`;
}
