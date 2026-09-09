/**
 * Reference JSON used by the "Load Sample Template" button in `JsonTextImportModal`. Covers every
 * shape `parseJsonCardImport` understands in one file: the `{ decks: [...] }` wrapper, per-deck
 * `topicName`, and all three card templates the app supports, standard vocabulary (IPA, hint,
 * examples, synonyms, antonyms, `extraInfo`, `partsOfSpeech`), a grammar/rule card (plain
 * front/back + examples). `backAnswer` and `extraInfo` follow the same field-separation rules the
 * AI Auto-Fill prompts use (see `card-autofill-prompt-builder.ts`): `backAnswer` is just the core
 * meaning with no restated headword, examples/synonyms/antonyms live in their own arrays instead of
 * being embedded in either HTML field, and `extraInfo` is reserved for deeper linguistic context.
 */
const SAMPLE_JSON_IMPORT_DATA = {
  decks: [
    {
      name: 'Vocabulary',
      topicName: 'Everyday Words',
      cards: [
        {
          frontTitle: 'Ubiquitous',
          backAnswer:
            'Present, appearing, or found absolutely everywhere.\n\nفارسی: همه‌جا حاضر، فراگیر',
          extraInfo:
            '<h3>Usage Nuance &amp; Register</h3><p>Neutral-to-formal, common in writing and educated speech, rarely in casual small talk. Carries no emotional charge; it simply emphasizes how widespread something is.</p>' +
            '<h3>Collocations</h3><ul><li><strong>ubiquitous</strong> presence</li><li><strong>ubiquitous</strong> in modern life</li><li>become <strong>ubiquitous</strong></li></ul>' +
            '<h3>Common Pitfalls</h3><p>Not the same as <strong>common</strong> (merely frequent), "ubiquitous" specifically means present <em>everywhere at once</em>, so it overstates things if the item only appears often rather than universally.</p>',
          ipa: '/juːˈbɪkwɪtəs/',
          hint: 'Think of smartphones, seen absolutely everywhere.',
          examples: [
            'Smartphones have become ubiquitous in modern life.',
            'Coffee shops are ubiquitous in this city.',
          ],
          synonyms: ['omnipresent', 'pervasive', 'widespread'],
          antonyms: ['rare', 'scarce'],
          tagNames: ['Vocabulary', 'Adjective'],
          partsOfSpeech: [
            {
              pos: 'adjective',
              wordForm: 'Ubiquitous',
              definition: 'Present, appearing, or found everywhere.',
              ipa: '/juːˈbɪkwɪtəs/',
              examples: ['Ubiquitous computing is changing how we live.'],
            },
            {
              pos: 'noun',
              wordForm: 'Ubiquity',
              definition: 'The state or fact of being everywhere at once.',
              examples: ['The ubiquity of smartphones has changed how people communicate.'],
            },
            {
              pos: 'adverb',
              wordForm: 'Ubiquitously',
              definition: 'In a way that is present or found everywhere.',
              examples: ['Free wifi is now ubiquitously available in this city.'],
            },
          ],
        },
      ],
    },
    {
      name: 'Grammar',
      topicName: 'Tenses',
      cards: [
        {
          frontTitle: 'Present Perfect Tense',
          backAnswer:
            'Use the Present Perfect (have/has + past participle) for actions that started in the past and continue now, or past actions with a present result.',
          extraInfo:
            '<h3>Contrasts With</h3><p>The Simple Past (<em>I lived here for five years</em>, now finished) states a closed event with a specific past time; the Present Perfect leaves the timeframe open or connects it to now.</p>' +
            '<h3>Common Pitfalls</h3><p>Never pair it with a specific past time word like "yesterday" or "in 2019", those force the Simple Past instead.</p>',
          examples: ['I have lived here for five years.', 'She has just finished her homework.'],
          tagNames: ['Grammar', 'Tenses'],
        },
      ],
    },
  ],
};

export const SAMPLE_JSON_IMPORT_TEMPLATE = JSON.stringify(SAMPLE_JSON_IMPORT_DATA, null, 2);
