import { useCardStore } from '@/stores/card-store';
import { useDeckStore } from '@/stores/deck-store';
import { useTopicStore } from '@/stores/topic-store';
import type { Card, NewCard } from '@/types/card';
import type { DuplicateCardSide } from '@/types/duplicate-card';
import { findExactDuplicateCard } from '@/utils/duplicate-cards';

/**
 * The app-wide "does this card already exist?" check, for every path that saves a card from the
 * UI: the card editor (manual and AI-filled), the JSON importer, and the Excel importer.
 *
 * Matching lives in `utils/duplicate-cards.ts` so the pure importers can share the exact same
 * rule without pulling in Pinia; this composable is only the Vue-facing wrapper that reads the
 * card store and turns a matched `Card` into something a modal can display.
 *
 * Deliberately *not* wired into `cardStore.add`/`addMany` themselves: those are also how the
 * first-run seed, backup restore, and Cloud Sync write cards, and none of those should ever stop
 * to ask the user about a duplicate. Detection belongs at the point where a person pressed save.
 */
export function useDuplicateCardCheck() {
  const cardStore = useCardStore();
  const deckStore = useDeckStore();
  const topicStore = useTopicStore();

  /** The saved card whose title exactly matches, if any. Pass `excludeId` when editing so a card
   *  is never reported as a duplicate of itself. */
  async function findDuplicate(frontTitle: string, excludeId?: string): Promise<Card | undefined> {
    await cardStore.ensureLoaded();
    return findExactDuplicateCard(frontTitle, cardStore.cards, excludeId);
  }

  /** Describes a saved card for the comparison shown in the duplicate modals. */
  function describeSavedCard(card: Card): DuplicateCardSide {
    return {
      frontTitle: card.frontTitle,
      deckName: deckStore.getById(card.deckId)?.name ?? 'Unknown deck',
      topicName: card.topicId ? topicStore.getById(card.topicId)?.name : undefined,
      summary: card.backAnswer,
      createdAt: card.createdAt,
    };
  }

  /** Describes an unsaved card (the editor's draft) for the same comparison. */
  function describeNewCard(card: NewCard): DuplicateCardSide {
    return {
      frontTitle: card.frontTitle,
      deckName: deckStore.getById(card.deckId)?.name ?? 'Unknown deck',
      topicName: card.topicId ? topicStore.getById(card.topicId)?.name : undefined,
      summary: card.backAnswer,
    };
  }

  return { findDuplicate, describeSavedCard, describeNewCard };
}
