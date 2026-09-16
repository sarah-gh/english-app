import {
  aiQuizResultRepository,
  cardRepository,
  deckRepository,
  tagRepository,
  topicRepository,
} from '@/db/repositories';
import { deduplicateByName, deduplicateCards, healReference } from '@/services/sync/merge';
import type { AiQuizResult } from '@/types/ai-quiz-result';
import type { Card } from '@/types/card';

/**
 * Collapses Deck/Topic/Tag rows that share a normalized name but different ids, and Cards that
 * share a deck and normalized front text but different ids, the situation two independently
 * seeded or independently created devices produce (e.g. both create a "Grammar" deck, or both get
 * the same default card), which the id-based sync merge can't detect on its own since it only ever
 * reconciles records that already share an id. Redundant rows are soft-deleted (never hard-removed
 *, the usual 30-day tombstone GC still applies to them), and every Card/Topic that referenced a
 * deduplicated Deck/Topic/Tag is re-pointed to the surviving row.
 *
 * Card deduplication runs *after* the Deck/Topic/Tag dedup and reference healing below, against
 * the healed `deckId`s, otherwise two duplicate cards that each still point at a different,
 * not-yet-collapsed duplicate deck id would look like they belong to different decks and never get
 * grouped together.
 *
 * Purely local, reads and writes only this device's IndexedDB, no network involved. `syncNow`
 * calls this right after merging local and remote data (so cross-device duplicates are visible to
 * it), but it's just as meaningful to call standalone: it also cleans up duplicates that predate
 * Cloud Sync entirely, e.g. from a bug or a messy import, on a device that never syncs at all.
 */
export async function deduplicateLocalData(): Promise<void> {
  const [decks, topics, tags, cards, quizHistory] = await Promise.all([
    deckRepository.getAllIncludingDeleted(),
    topicRepository.getAllIncludingDeleted(),
    tagRepository.getAllIncludingDeleted(),
    cardRepository.getAllIncludingDeleted(),
    aiQuizResultRepository.getAll(),
  ]);

  const dedupedDecks = deduplicateByName(decks);
  const decksById = new Map(dedupedDecks.map((deck) => [deck.id, deck]));

  const now = Date.now();
  const healedTopics = topics.map((topic) => {
    const healedDeckId = healReference(decksById, topic.deckId) ?? topic.deckId;
    return healedDeckId === topic.deckId
      ? topic
      : { ...topic, deckId: healedDeckId, updatedAt: now };
  });
  const dedupedTopics = deduplicateByName(healedTopics, { scopeKey: (topic) => topic.deckId });
  const topicsById = new Map(dedupedTopics.map((topic) => [topic.id, topic]));

  const dedupedTags = deduplicateByName(tags);
  const tagsById = new Map(dedupedTags.map((tag) => [tag.id, tag]));

  const healedCards = cards.map((card): Card => {
    const healedDeckId = healReference(decksById, card.deckId) ?? card.deckId;
    const healedTopicId = healReference(topicsById, card.topicId, {
      scopeKey: (topic) => topic.deckId,
    });
    const healedTagIds = card.tagIds.map((tagId) => healReference(tagsById, tagId) ?? tagId);

    const unchanged =
      healedDeckId === card.deckId &&
      healedTopicId === card.topicId &&
      healedTagIds.length === card.tagIds.length &&
      healedTagIds.every((tagId, index) => tagId === card.tagIds[index]);
    if (unchanged) return card;

    return {
      ...card,
      deckId: healedDeckId,
      topicId: healedTopicId,
      tagIds: healedTagIds,
      updatedAt: now,
    };
  });
  const dedupedCards = deduplicateCards(healedCards);

  // Quiz results aren't deduplicated themselves (two devices' quiz attempts are never "the same
  // record" just because they cover the same cards), but each one's `deckIds`/`topicIds` still need
  // the same healing cards get above, otherwise a quiz taken before a same-named duplicate deck/
  // topic got collapsed keeps pointing at the now-tombstoned id and silently drops that deck's name
  // from the history list (see `AiQuizHistoryList.vue`'s `deckNames`).
  const healedQuizHistory = quizHistory.map((result): AiQuizResult => {
    const healedDeckIds = result.deckIds.map((deckId) => healReference(decksById, deckId) ?? deckId);
    const healedTopicIds = result.topicIds.map(
      (topicId) =>
        healReference(topicsById, topicId, { scopeKey: (topic) => topic.deckId }) ?? topicId,
    );

    const unchanged =
      healedDeckIds.every((id, index) => id === result.deckIds[index]) &&
      healedTopicIds.every((id, index) => id === result.topicIds[index]);
    if (unchanged) return result;

    return { ...result, deckIds: healedDeckIds, topicIds: healedTopicIds, updatedAt: now };
  });

  // Index-aligned with the original reads throughout (every transform above preserves order and
  // length), and every unchanged entity kept its original object reference, so a plain `!==`
  // finds exactly what changed, without writing back rows that didn't need it.
  const changedDecks = dedupedDecks.filter((deck, index) => deck !== decks[index]);
  const changedTopics = dedupedTopics.filter((topic, index) => topic !== topics[index]);
  const changedTags = dedupedTags.filter((tag, index) => tag !== tags[index]);
  const changedCards = dedupedCards.filter((card, index) => card !== cards[index]);
  const changedQuizHistory = healedQuizHistory.filter((result, index) => result !== quizHistory[index]);

  await Promise.all([
    changedDecks.length > 0 ? deckRepository.bulkPut(changedDecks) : undefined,
    changedTopics.length > 0 ? topicRepository.bulkPut(changedTopics) : undefined,
    changedTags.length > 0 ? tagRepository.bulkPut(changedTags) : undefined,
    changedCards.length > 0 ? cardRepository.bulkPut(changedCards) : undefined,
    changedQuizHistory.length > 0 ? aiQuizResultRepository.bulkPut(changedQuizHistory) : undefined,
  ]);
}
