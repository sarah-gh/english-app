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

Generate the back-side content for this flashcard:
- backAnswer: a concise definition or explanation of the term/topic, appropriate to what it is (a vocabulary word, a grammar point, an idiom, etc).
- ipa: the IPA phonetic transcription, only if the title is a single word or short phrase with a standard pronunciation — omit it otherwise (e.g. for grammar topics like "Present Perfect Tense").
- hint: a short, helpful memory cue — this is hidden until tapped during review, so it should nudge recall without giving the answer away outright.
- personalExamples: relatable, real-life example sentences that use the term/topic the way an actual person would say it in conversation, texting, or everyday situations — never dry textbook sentences.
  - For Vocabulary or Idioms & Expressions: at least 2 example sentences.
  - For Grammar: at least 3 example sentences that each demonstrate a different usage structure of the topic (e.g. affirmative, negative, and question forms, or other distinct patterns the topic supports).
- partsOfSpeech: only if the title is a single word with more than one common part of speech worth distinguishing (e.g. "book" as both noun and verb) — one entry per part of speech, each with its own definition, IPA, and 1-2 examples. Omit entirely (or leave empty) for grammar topics, idioms, phrases, or single-part-of-speech words.
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
