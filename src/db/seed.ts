import { cardRepository } from './repositories/card-repository';
import { deckRepository } from './repositories/deck-repository';
import { settingsRepository } from './repositories/settings-repository';
import { tagRepository } from './repositories/tag-repository';
import { topicRepository } from './repositories/topic-repository';
import type { PartOfSpeechEntry } from '@/types/card';

interface SeedCard {
  frontTitle: string;
  backAnswer: string;
  ipa?: string;
  hint?: string;
  examples?: string[];
  synonyms?: string[];
  antonyms?: string[];
  tagNames?: string[];
  partsOfSpeech?: Array<Omit<PartOfSpeechEntry, 'id'>>;
}

/** Colors for seed tags only — real tags get a color picker in the UI. Falls back to a neutral
 *  gray for any seed tag name not listed here. */
const SEED_TAG_COLORS: Record<string, string> = {
  Tenses: '#3b82f6',
  Conditionals: '#8b5cf6',
  Advanced: '#f97316',
  'Multi-meaning': '#ec4899',
  Social: '#10b981',
};

interface SeedDeck {
  name: string;
  cards: SeedCard[];
}

const SEED_DECKS: SeedDeck[] = [
  {
    name: 'Grammar',
    cards: [
      {
        frontTitle: 'Present Perfect Tense',
        backAnswer:
          'Formed with "have/has" + past participle. Used for a past action with a result or relevance in the present.',
        hint: 'An action that started in the past but still matters now.',
        examples: ['I have finished my homework.', 'She has lived here for ten years.'],
        tagNames: ['Tenses'],
      },
      {
        frontTitle: 'Third Conditional',
        backAnswer:
          '"If" + past perfect, "would have" + past participle. Describes an unreal, hypothetical past situation.',
        hint: 'Used for regrets or imagined past outcomes.',
        examples: ['If I had studied, I would have passed the exam.'],
        tagNames: ['Tenses', 'Conditionals'],
      },
      {
        frontTitle: 'Countable vs. Uncountable Nouns',
        backAnswer:
          'Countable nouns can be counted individually ("book", "books"). Uncountable nouns cannot ("water", "advice").',
        examples: ['I have three books.', 'I need some advice.'],
      },
    ],
  },
  {
    name: 'Vocabulary',
    cards: [
      {
        // Both synonyms and antonyms filled.
        frontTitle: 'Ubiquitous',
        backAnswer: 'Present, appearing, or found everywhere.',
        ipa: '/juːˈbɪkwɪtəs/',
        examples: ['Smartphones have become ubiquitous in modern life.'],
        synonyms: ['omnipresent', 'pervasive', 'widespread'],
        antonyms: ['rare', 'scarce'],
        tagNames: ['Advanced'],
      },
      {
        // Synonyms only.
        frontTitle: 'Serendipity',
        backAnswer: 'The occurrence of finding pleasant things by chance.',
        ipa: '/ˌsɛrənˈdɪpɪti/',
        examples: ['Meeting my business partner was pure serendipity.'],
        synonyms: ['chance', 'fluke', 'providence'],
      },
      {
        // Antonyms only.
        frontTitle: 'Meticulous',
        backAnswer: 'Showing great attention to detail; very careful and precise.',
        ipa: '/məˈtɪkjʊləs/',
        examples: ['She is meticulous about checking her work for errors.'],
        antonyms: ['careless', 'sloppy', 'negligent'],
        tagNames: ['Advanced'],
      },
      {
        // Parts of Speech filled — one root word, three grammatical categories.
        frontTitle: 'Present',
        backAnswer: 'A word whose meaning and pronunciation change with its part of speech.',
        tagNames: ['Advanced', 'Multi-meaning'],
        partsOfSpeech: [
          {
            pos: 'noun',
            wordForm: 'Present',
            definition: 'A gift given to someone.',
            ipa: '/ˈprɛzənt/',
            examples: ['She gave him a present for his birthday.'],
          },
          {
            pos: 'verb',
            wordForm: 'Present',
            definition: 'To give, show, or introduce something formally.',
            ipa: '/prɪˈzɛnt/',
            examples: ['He will present his findings tomorrow.'],
          },
          {
            pos: 'adjective',
            wordForm: 'Present',
            definition: 'Existing or occurring now; currently existing or attending.',
            ipa: '/ˈprɛzənt/',
            examples: ['All members were present at the meeting.'],
          },
        ],
      },
    ],
  },
  {
    name: 'Idioms',
    cards: [
      {
        frontTitle: 'Break the ice',
        backAnswer: 'To do or say something that relieves tension or awkwardness in a social situation.',
        examples: ['He told a joke to break the ice at the meeting.'],
        tagNames: ['Social'],
      },
      {
        frontTitle: 'Piece of cake',
        backAnswer: 'Something very easy to do.',
        examples: ['The exam was a piece of cake.'],
        synonyms: ['walk in the park', "child's play"],
        tagNames: ['Social'],
      },
      {
        frontTitle: 'Hit the books',
        backAnswer: 'To study hard.',
        examples: ['I have to hit the books tonight, my exam is tomorrow.'],
      },
    ],
  },
];

/**
 * Populates a starter set of decks/cards on first launch only, gated by a persisted
 * settings flag (not "is the deck table empty") so intentionally deleting the sample
 * data later never brings it back.
 */
export async function seedInitialDataIfNeeded(): Promise<void> {
  const settings = await settingsRepository.get();
  if (settings.hasSeededInitialData) return;

  // Shared across every deck (tags aren't deck-scoped), so a name reused on a later card — e.g.
  // "Advanced" on both Ubiquitous and Present — resolves to the same tag instead of a duplicate.
  const tagIdByName = new Map<string, string>();
  async function resolveTagIds(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const name of names) {
      let id = tagIdByName.get(name);
      if (!id) {
        const tag = await tagRepository.create({ name, color: SEED_TAG_COLORS[name] ?? '#6b7280' });
        id = tag.id;
        tagIdByName.set(name, id);
      }
      ids.push(id);
    }
    return ids;
  }

  for (const seedDeck of SEED_DECKS) {
    const deck = await deckRepository.create({ name: seedDeck.name });
    const topic = await topicRepository.create({ deckId: deck.id, name: 'General' });
    for (const seedCard of seedDeck.cards) {
      await cardRepository.create({
        frontTitle: seedCard.frontTitle,
        backAnswer: seedCard.backAnswer,
        deckId: deck.id,
        topicId: topic.id,
        tagIds: await resolveTagIds(seedCard.tagNames ?? []),
        ipa: seedCard.ipa,
        ttsEnabled: true,
        hint: seedCard.hint,
        examples: seedCard.examples ?? [],
        synonyms: seedCard.synonyms ?? [],
        antonyms: seedCard.antonyms ?? [],
        quizQuestions: [],
        partsOfSpeech: seedCard.partsOfSpeech?.map((entry) => ({ ...entry, id: crypto.randomUUID() })),
      });
    }
  }

  await settingsRepository.update({ hasSeededInitialData: true });
}
