import { cardRepository } from '@/db/repositories/card-repository';
import { deckRepository } from '@/db/repositories/deck-repository';
import { settingsRepository } from '@/db/repositories/settings-repository';
import { tagRepository } from '@/db/repositories/tag-repository';
import { DEFAULT_SETTINGS } from '@/types/settings';

/**
 * Wipes every deck, card, and tag, and resets settings to their defaults. `hasSeededInitialData`
 * is deliberately left `true` so the sample decks don't silently reappear on the next launch —
 * a user who clears everything (often right before importing a backup) wants it to stay empty.
 */
export async function clearAllData(): Promise<void> {
  await Promise.all([cardRepository.clear(), deckRepository.clear(), tagRepository.clear()]);
  const { id: _id, updatedAt: _updatedAt, hasSeededInitialData: _seeded, ...defaults } = DEFAULT_SETTINGS;
  await settingsRepository.update({ ...defaults, hasSeededInitialData: true });
}
