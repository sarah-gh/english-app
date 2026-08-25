import { aiQuizResultRepository } from '@/db/repositories/ai-quiz-result-repository';
import { cardRepository } from '@/db/repositories/card-repository';
import { dailyStatRepository } from '@/db/repositories/daily-stat-repository';
import { deckRepository } from '@/db/repositories/deck-repository';
import { settingsRepository } from '@/db/repositories/settings-repository';
import { tagRepository } from '@/db/repositories/tag-repository';
import { topicRepository } from '@/db/repositories/topic-repository';
import { DEFAULT_SETTINGS } from '@/types/settings';

/**
 * Wipes every deck, topic, card, tag, AI quiz result, and daily stat, and resets settings to
 * their defaults. `hasSeededInitialData` is deliberately left `true` so the sample decks don't
 * silently reappear on the next launch — a user who clears everything (often right before
 * importing a backup) wants it to stay empty.
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([
    cardRepository.clear(),
    deckRepository.clear(),
    tagRepository.clear(),
    topicRepository.clear(),
    aiQuizResultRepository.clear(),
    dailyStatRepository.clear(),
  ]);
  const { id: _id, updatedAt: _updatedAt, hasSeededInitialData: _seeded, ...defaults } = DEFAULT_SETTINGS;
  await settingsRepository.update({ ...defaults, hasSeededInitialData: true });
}
