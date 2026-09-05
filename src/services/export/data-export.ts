import { aiQuizResultRepository } from '@/db/repositories/ai-quiz-result-repository';
import { cardRepository } from '@/db/repositories/card-repository';
import { dailyStatRepository } from '@/db/repositories/daily-stat-repository';
import { deckRepository } from '@/db/repositories/deck-repository';
import { settingsRepository } from '@/db/repositories/settings-repository';
import { tagRepository } from '@/db/repositories/tag-repository';
import { topicRepository } from '@/db/repositories/topic-repository';

const EXPORT_VERSION = 1;

/**
 * Dumps every deck, topic, tag, card (with its study count, review difficulty, and tags), AI quiz
 * history, daily study log, and user setting into a single downloadable JSON file. Unlike
 * `exportBackup`, this is a plain-data snapshot for reading/archiving rather than a restorable
 * backup, so card audio/image Blobs (which can't survive `JSON.stringify`) are dropped, and API
 * keys are intentionally excluded — including them would turn a shared export into a leaked
 * credential.
 */
export async function exportDataAsJson(): Promise<void> {
  const [cards, decks, topics, tags, aiQuizResults, dailyStats, settings] = await Promise.all([
    cardRepository.getAll(),
    deckRepository.getAll(),
    topicRepository.getAll(),
    tagRepository.getAll(),
    aiQuizResultRepository.getAll(),
    dailyStatRepository.getAll(),
    settingsRepository.get(),
  ]);

  const cardRecords = cards.map(({ audioBlob, imageBlob, ...rest }) => rest);

  const payload = {
    version: EXPORT_VERSION,
    exportedAt: Date.now(),
    decks,
    topics,
    tags,
    cards: cardRecords,
    aiQuizResults,
    dailyStats,
    settings: {
      speechAccent: settings.speechAccent,
      proficiencyLevel: settings.proficiencyLevel,
      dailyGoalCards: settings.dailyGoalCards,
    },
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `flashcards_backup_${dateStamp}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
