import { cardRepository } from './repositories/card-repository';
import { deckRepository } from './repositories/deck-repository';
import { settingsRepository } from './repositories/settings-repository';
import { topicRepository } from './repositories/topic-repository';

interface SeedCard {
  frontTitle: string;
  backAnswer: string;
  ipa?: string;
  hint?: string;
  examples?: string[];
}

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
      },
      {
        frontTitle: 'Third Conditional',
        backAnswer:
          '"If" + past perfect, "would have" + past participle. Describes an unreal, hypothetical past situation.',
        hint: 'Used for regrets or imagined past outcomes.',
        examples: ['If I had studied, I would have passed the exam.'],
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
        frontTitle: 'Ubiquitous',
        backAnswer: 'Present, appearing, or found everywhere.',
        ipa: '/juːˈbɪkwɪtəs/',
        examples: ['Smartphones have become ubiquitous in modern life.'],
      },
      {
        frontTitle: 'Serendipity',
        backAnswer: 'The occurrence of finding pleasant things by chance.',
        ipa: '/ˌsɛrənˈdɪpɪti/',
        examples: ['Meeting my business partner was pure serendipity.'],
      },
      {
        frontTitle: 'Meticulous',
        backAnswer: 'Showing great attention to detail; very careful and precise.',
        ipa: '/məˈtɪkjʊləs/',
        examples: ['She is meticulous about checking her work for errors.'],
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
      },
      {
        frontTitle: 'Piece of cake',
        backAnswer: 'Something very easy to do.',
        examples: ['The exam was a piece of cake.'],
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

  for (const seedDeck of SEED_DECKS) {
    const deck = await deckRepository.create({ name: seedDeck.name });
    const topic = await topicRepository.create({ deckId: deck.id, name: 'General' });
    for (const seedCard of seedDeck.cards) {
      await cardRepository.create({
        frontTitle: seedCard.frontTitle,
        backAnswer: seedCard.backAnswer,
        deckId: deck.id,
        topicId: topic.id,
        tagIds: [],
        ipa: seedCard.ipa,
        ttsEnabled: true,
        hint: seedCard.hint,
        examples: seedCard.examples ?? [],
        quizQuestions: [],
      });
    }
  }

  await settingsRepository.update({ hasSeededInitialData: true });
}
