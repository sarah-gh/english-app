/**
 * Reference JSON used by the "Load Sample Template" button in `JsonTextImportModal`. Covers every
 * shape `parseJsonCardImport` understands in one file: the `{ decks: [...] }` wrapper, per-deck
 * `topicName`, and all three card templates the app supports — standard vocabulary (IPA, hint,
 * examples, synonyms, antonyms, `partsOfSpeech`), a grammar/rule card (plain front/back + examples),
 * and a Word Family card (`wordFamily`).
 */
const SAMPLE_JSON_IMPORT_DATA = {
  decks: [
    {
      name: 'Vocabulary',
      topicName: 'Everyday Words',
      cards: [
        {
          frontTitle: 'Ubiquitous',
          backAnswer: 'Present, appearing, or found everywhere.',
          ipa: '/juːˈbɪkwɪtəs/',
          hint: 'Think of smartphones — seen absolutely everywhere.',
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
          examples: ['I have lived here for five years.', 'She has just finished her homework.'],
          tagNames: ['Grammar', 'Tenses'],
        },
      ],
    },
  ],
};

export const SAMPLE_JSON_IMPORT_TEMPLATE = JSON.stringify(SAMPLE_JSON_IMPORT_DATA, null, 2);
