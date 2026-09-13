import type { PromptKey } from '@/types/settings';

/** One `{token}` a prompt template can reference; shown in Settings as a reference for users
 *  writing their own custom prompt. */
export interface PromptPlaceholder {
  token: string;
  description: string;
}

export interface PromptDefinition {
  key: PromptKey;
  title: string;
  description: string;
  placeholders: PromptPlaceholder[];
  /** The built-in prompt template, used whenever the user hasn't saved a custom override, and as
   *  the reference restored by "Reset to Default". */
  defaultPrompt: string;
}

const CARD_AUTOFILL_DEFAULT_PROMPT = `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "{frontTitle}".{deckNameHint}{userLevelHint}

STRICT LANGUAGE REQUIREMENT: every field you generate (backAnswer, extraInfo, hint, personalExamples, synonyms, antonyms, partsOfSpeech, suggestedTags, suggestedDeckCategory, and any other field) MUST be written entirely in English. Never provide a Persian/Farsi translation, gloss, or any other non-English text under any circumstances, regardless of the card's type, the front title's language or script, grammar pattern, or the learner's query.

First, silently classify the topic into exactly one category: "Vocabulary" (a single word or short phrase), "Idioms & Expressions" (an idiom, phrasal verb, or fixed expression), or "Grammar" (a grammar point, tense, or structure). Use this classification to guide the fields below.

Every piece of content belongs in exactly ONE field. Example sentences, synonyms, and antonyms each have their own dedicated field below and must NEVER also appear inside the "backAnswer" or "extraInfo" HTML, the app renders those fields separately, so repeating them there duplicates content on the card.

Generate the back-side content for this flashcard:
- backAnswer: ONLY the core meaning, a brief, clear English definition or functional explanation (for a grammar structure or idiom, explain its usage context or grammatical function instead of a dictionary-style definition). Before writing it, silently identify the exact Part of Speech (Noun, Verb, Adjective, Adverb, etc.) of "{frontTitle}" as it is spelled, not the part of speech of a related root word. The English definition MUST match that exact part of speech, never substitute the meaning of a different word form (e.g. for the adjective "Ambitious", define it as an adjective — "having or showing a strong desire and determination to succeed" — never with the noun "ambition"'s meaning, "a strong desire to achieve something"). Two short sentences at most. No example sentences, no synonym or antonym lists, no extended notes, no translation into any other language. Never open by restating the term itself, no "{frontTitle} means …", no "{frontTitle}: …" prefix, start directly with the meaning or grammatical function (e.g. for "Intimidating", begin "Causing fear or nervousness in someone …"). The card's front already shows the term, so repeating it wastes the reader's first glance. This is the first thing shown on the back of the card during review, so it must be readable at a glance. Format this as clean HTML using only <p>, <strong>, <em> (never <script>, <style>, headings, lists, or any attributes), short prose, not a structured document.
- extraInfo: the deeper linguistic context that doesn't fit in the concise "backAnswer". Format this as clean, structured HTML using only these tags: <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li> (never <script>, <style>, or any attributes), one <h3> heading per section, <p> for prose, <ul>/<li> for lists. Cover whichever of these sections are genuinely useful for this term/topic:
  - "Usage Nuance & Register": formal vs. casual vs. neutral contexts, emotional tone and connotation, whether it's more common in speech or writing, and how strong/intense it sounds.
  - "Collocations & Preposition Patterns": the words and prepositions this term habitually combines with, shown as short patterns (e.g. "intimidated by someone").
  - "Verb Forms & Tenses" (verbs only): base, past simple, past participle, and -ing forms, explicitly flagging irregular forms.
  - "Phrasal Verbs & Preposition Patterns" (verbs only, when applicable): e.g. "take off", "look after", each with a brief meaning and how it's used.
  - "Common Pitfalls & Easily Confused Words": near-neighbour words learners mix this up with and precisely how they differ (e.g. how "intimidating" differs from "frightening" or "scary"), plus mistakes learners typically make with it.
  - "Cultural & Practical Context": when and where native speakers actually reach for this term in real life.
  - For Idioms & Expressions, also cover origin/etymology notes and how fixed or flexible the wording is. For Grammar topics, also cover the structures it contrasts with and the rules governing its use.
  Rules for extraInfo: never include a bare list of synonyms or antonyms, and never include standalone example sentences, those belong in the dedicated fields below. DO NOT include Word Family, Parts of Speech, or related word forms (noun/verb/adjective/adverb variants) here in any form, not as a heading, list, or passing mention, that information belongs exclusively in the dedicated "partsOfSpeech" field below, repeating it here duplicates the card. Contrasting a confusable word with an explanation of the difference is fine; short illustrative fragments inside a nuance explanation are fine; a list of similar words or a block of practice sentences is not. Omit any section with nothing meaningful to add, and omit "extraInfo" entirely only if there is genuinely nothing beyond the definition worth knowing.
- ipa: the IPA phonetic transcription, only if the title is a single word or short phrase with a standard pronunciation, omit it otherwise (e.g. for grammar topics like "Present Perfect Tense").
- hint: a short, helpful memory cue, this is hidden until tapped during review, so it should nudge recall without giving the answer away outright.
- personalExamples: relatable, real-life example sentences that use the term/topic the way an actual person would say it in conversation, texting, or everyday situations, never dry textbook sentences. Plain sentence strings, with no HTML and no surrounding quotes.
  - For Vocabulary or Idioms & Expressions: at least 2 example sentences.
  - For Grammar: at least 3 example sentences that each demonstrate a different usage structure of the topic (e.g. affirmative, negative, and question forms, or other distinct patterns the topic supports).
- synonyms: 3-5 words or short phrases meaning roughly the same thing, as plain strings (e.g. ["frightening", "daunting"]), no HTML, no bullets, no explanations. Return an empty list when the term genuinely has no useful synonyms (most grammar topics).
- antonyms: 2-5 opposites in the same plain-string form (e.g. ["reassuring", "comforting", "encouraging"]). Return an empty list when nothing meaningfully opposes the term.
- partsOfSpeech: for a single vocabulary word, list every part of speech worth knowing about it, this is the ONLY place related noun/verb/adjective/adverb forms belong now (do not describe them in "extraInfo" instead). Cover both: (a) other grammatical uses of the title's own spelling (e.g. "book" as both noun and verb), and (b) closely related noun/verb/adjective/adverb forms with a different spelling (e.g. for "Intimidating": verb "intimidate", noun "intimidation", adverb "intimidatingly", alongside the adjective entry for "intimidating" itself). Always include an entry for the title's own exact part of speech. One entry per part of speech/form, each with its own definition, IPA, and 1-2 examples. Always include wordForm: the exact spelling of that part of speech, use the title itself when the spelling doesn't change (e.g. wordForm "book" for both the noun and verb entries of "book"), or the distinct spelling when it does (e.g. wordForm "decision" for the noun form of "decide"). Never leave wordForm blank. Each entry's "pos" and "definition" must describe that entry's own "wordForm" exactly as that specific part of speech, never the meaning of a different entry's word form (e.g. the "adjective" entry for "decisive" must be defined and translated as an adjective, not as the "noun" entry's "decision" meaning reused with a different label). Omit partsOfSpeech entirely (or leave empty) only for grammar topics, idioms, or fixed phrases with no meaningful parts of speech to distinguish.
- suggestedTags: 2-3 short, relevant tag names (e.g. "B2", "Verbs", "Business", "Idioms"), plain words, no leading "#".
- suggestedDeckCategory: the category name you classified above ("Vocabulary", "Idioms & Expressions", or "Grammar"), always include this even if a deck was already hinted above.

Respond only with the structured fields requested.`;

const EXTRA_INFO_DEFAULT_PROMPT = `You are helping an English-language learner build a flashcard. {contextClause}{userLevelHint}

STRICT LANGUAGE REQUIREMENT: the "Extra Information" section MUST be written entirely in English. Never provide a Persian/Farsi translation or any other non-English text under any circumstances, regardless of the card's type, title, or grammar pattern.

Write the "Extra Information" section: deeper linguistic context that wouldn't fit in a concise definition. The card has its own separate fields for example sentences, synonyms, and antonyms, so none of those may appear here, the app renders them separately and repeating them duplicates content on the card.

Format this as clean, structured HTML using only these tags: <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li> (never <script>, <style>, or any attributes), one <h3> heading per section, <p> for prose, <ul>/<li> for lists. Cover whichever of these sections are genuinely useful for this term/topic:
  - "Verb Forms & Tenses" (verbs only): base, past simple, past participle, and -ing forms, explicitly flagging irregular forms.
  - "Collocations & Preposition Patterns": the words and prepositions this term habitually combines with, shown as short patterns (e.g. "intimidated by someone").
  - "Usage Nuance & Register": formal vs. casual vs. neutral contexts, emotional tone and connotation, whether it's more common in speech or writing, and how strong/intense it sounds.
  - "Cultural & Practical Context": when and where native speakers actually reach for this term in real life, plus origin/etymology notes and how fixed or flexible the wording is for idioms and expressions.

Rules: never include a bare list of synonyms or antonyms, and never include standalone example sentences, those belong to the card's own dedicated fields. DO NOT include Word Family, Parts of Speech, or related word forms (noun/verb/adjective/adverb variants) here in any form, not as a heading, list, or passing mention, that information belongs exclusively in the card's dedicated "Parts of Speech" field, repeating it here duplicates the card. Contrasting a confusable word with an explanation of the difference is fine; short illustrative fragments inside a nuance explanation are fine; a list of similar words or a block of practice sentences is not. Omit any section with nothing meaningful to add.

Respond only with the structured field requested.`;

const PARTS_OF_SPEECH_DEFAULT_PROMPT = `You are helping an English-language learner build a flashcard. The flashcard's front title/topic is: "{frontTitle}".{userLevelHint}

STRICT LANGUAGE REQUIREMENT: every definition and example you write MUST be strictly in English. Never provide a Persian/Farsi translation or any other non-English text under any circumstances.

If this title is a single vocabulary word, list every part of speech worth knowing about it. Cover both: (a) other grammatical uses of the title's own spelling (e.g. "book" as both noun and verb), and (b) closely related noun/verb/adjective/adverb forms with a different spelling (e.g. for "Intimidating": verb "intimidate", noun "intimidation", adverb "intimidatingly", alongside the adjective entry for "intimidating" itself). Always include an entry for the title's own exact part of speech. One entry per part of speech/form, each with its own definition, IPA, and 1-2 examples. Always include wordForm: the exact spelling of that part of speech, use the title itself when the spelling doesn't change (e.g. wordForm "book" for both the noun and verb entries of "book"), or the distinct spelling when it does (e.g. wordForm "decision" for the noun form of "decide"). Never leave wordForm blank. Each entry's "pos" and "definition" must describe that entry's own "wordForm" exactly as that specific part of speech, never the meaning of a different entry's word form (e.g. the "adjective" entry for "decisive" must be defined and translated as an adjective, not as the "noun" entry's "decision" meaning reused with a different label). If the title is a grammar topic, idiom, or fixed phrase with no meaningful parts of speech, return an empty list. Respond only with the structured field requested.`;

const QUIZ_GENERATOR_DEFAULT_PROMPT = `You are creating a multiple-choice practice quiz for an English-language learner based on their personal flashcards below.

STRICT LANGUAGE REQUIREMENT: every question, option, and any other text you generate MUST be written entirely in English. Never provide a Persian/Farsi translation or any other non-English text under any circumstances, regardless of the flashcard content, terms, or grammar patterns involved.

Generate exactly {questionCount} multiple-choice questions that test whether the learner can correctly APPLY each flashcard's term, not just recognize its definition. For every question, invent a brand-new sentence, scenario, or fill-in-the-blank context that does not appear on the card (do not reuse or lightly reword the card's own Explanation/Answer text or its Examples as the question stem). Distribute the questions across the flashcards provided, favoring cards not yet covered before repeating one. Set "sourceIndex" to the flashcard's number (1-based) shown below that a question was drawn from.

Vary the question type across the batch instead of always asking "what does X mean?", mix in formats such as: a fill-in-the-blank sentence where the learner picks the word/form that correctly completes it, a question about which grammatical form is correct in context (using the Parts of speech info when available), and a short scenario where the learner picks which option best fits the situation. Each question must have EXACTLY 4 options in "options", with "correctOptionIndex" as the 0-based index of the correct one. Make the 3 incorrect options plausible distractors, confusable or related terms, common learner mistakes, or near-miss grammatical forms, rather than obviously wrong choices. Ground every question only in the flashcard content provided (do not invent unrelated facts or meanings), but express that content through new wording of your own.

STRICT OPTIONS REQUIREMENT: every question's "options" array must contain exactly 4 entries, and all 4 must be completely distinct strings from one another, character-for-character. Never repeat an option, never output two options that are identical or near-identical restatements of the same word/phrase, and never return fewer than 4 options. Each of the 4 options must represent a genuinely different answer choice.

The correct option MUST be randomly placed among the 4 choices (A, B, C, D / indices 0-3) for every question, independently each time, do not default to placing it first. Across the {questionCount} questions, spread "correctOptionIndex" roughly evenly over 0, 1, 2, and 3 rather than clustering it on one value.{cefrGuidance}

Flashcards:
{cardsSummary}`;

export const PROMPT_DEFINITIONS: PromptDefinition[] = [
  {
    key: 'CARD_AUTOFILL',
    title: 'Full Card Auto-Fill',
    description:
      "Generates every back-side field (definition, extra info, examples, parts of speech, tags) from just the card's front title.",
    placeholders: [
      { token: '{frontTitle}', description: "The card's front title/topic" },
      {
        token: '{deckName}',
        description: 'Name of the deck the card is being added to, empty if none',
      },
      {
        token: '{userLevel}',
        description: "The learner's self-assessed CEFR level, empty if not set",
      },
    ],
    defaultPrompt: CARD_AUTOFILL_DEFAULT_PROMPT,
  },
  {
    key: 'EXTRA_INFO',
    title: 'Extra Information',
    description:
      'Regenerates just the "Extra Information" field: deeper linguistic context such as register, collocations, and common pitfalls.',
    placeholders: [
      { token: '{frontTitle}', description: "The card's front title/topic" },
      {
        token: '{backAnswer}',
        description: "The card's existing back answer/definition, empty if none yet",
      },
      {
        token: '{userLevel}',
        description: "The learner's self-assessed CEFR level, empty if not set",
      },
    ],
    defaultPrompt: EXTRA_INFO_DEFAULT_PROMPT,
  },
  {
    key: 'PARTS_OF_SPEECH',
    title: 'Word Family & Parts of Speech',
    description:
      'Regenerates the Word Family / Parts of Speech list of related word forms for a term.',
    placeholders: [
      { token: '{frontTitle}', description: "The card's front title/topic" },
      {
        token: '{userLevel}',
        description: "The learner's self-assessed CEFR level, empty if not set",
      },
    ],
    defaultPrompt: PARTS_OF_SPEECH_DEFAULT_PROMPT,
  },
  {
    key: 'QUIZ_GENERATOR',
    title: 'Multiple-Choice Quiz Generator',
    description:
      'Generates the multiple-choice quiz questions used in the AI Quiz feature, grounded in the selected flashcards.',
    placeholders: [
      { token: '{questionCount}', description: 'Number of questions to generate' },
      {
        token: '{cardsSummary}',
        description:
          'A summary of the selected flashcards (term, definition, examples, parts of speech)',
      },
      {
        token: '{userLevel}',
        description: "The learner's self-assessed CEFR level, empty if not set",
      },
    ],
    defaultPrompt: QUIZ_GENERATOR_DEFAULT_PROMPT,
  },
];

export const PROMPT_METADATA: Record<PromptKey, PromptDefinition> = Object.fromEntries(
  PROMPT_DEFINITIONS.map((definition) => [definition.key, definition]),
) as Record<PromptKey, PromptDefinition>;

/** Replaces every `{token}` in a template with its value; tokens with no matching key are left
 *  untouched so a user's own template can safely reference only a subset of the variables. */
export function interpolatePrompt(template: string, variables: Record<string, string>): string {
  return Object.entries(variables).reduce(
    (result, [token, value]) => result.split(`{${token}}`).join(value),
    template,
  );
}

/** Resolves the effective template for one prompt key: the user's saved override if they've
 *  customized it (and it isn't blank), otherwise the built-in default. */
export function resolveActivePromptTemplate(
  customPrompts: Partial<Record<PromptKey, string | null>> | undefined,
  key: PromptKey,
): string {
  const userPrompt = customPrompts?.[key]?.trim();
  return userPrompt || PROMPT_METADATA[key].defaultPrompt;
}
