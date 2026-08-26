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
      name: 'Vocabulary Sample',
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
      name: 'Grammar Rules',
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
    {
      name: 'Word Families',
      topicName: 'Root Words',
      cards: [
        {
          frontTitle: 'Success (Word Family)',
          backAnswer: 'Explore the noun, verb, adjective, and adverb forms of "succeed".',
          tagNames: ['Word Family'],
          wordFamily: {
            rootWord: 'Succeed',
            noun: { word: 'Success', meaning: 'The achievement of a goal.', example: 'Her success surprised everyone.' },
            verb: { word: 'Succeed', meaning: 'To achieve a desired result.', example: 'He worked hard to succeed.' },
            adjective: {
              word: 'Successful',
              meaning: 'Having achieved success.',
              example: 'She is a successful entrepreneur.',
            },
            adverb: {
              word: 'Successfully',
              meaning: 'In a successful manner.',
              example: 'He successfully completed the project.',
            },
            usageNotes: '"Succeed" is often followed by "in" + gerund, e.g. "succeed in doing something."',
          },
        },
      ],
    },
  ],
};

export const SAMPLE_JSON_IMPORT_TEMPLATE = JSON.stringify(SAMPLE_JSON_IMPORT_DATA, null, 2);
