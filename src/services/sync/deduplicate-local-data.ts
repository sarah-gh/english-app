import { cardRepository, deckRepository, tagRepository, topicRepository } from '@/db/repositories';
import { deduplicateByName, healReference } from '@/services/sync/merge';
import type { Card } from '@/types/card';

/**
 * Collapses Deck/Topic/Tag rows that share a normalized name but different ids — the situation two
 * independently-seeded or independently-created devices produce (e.g. both create a "Grammar"
 * deck), which the id-based sync merge can't detect on its own since it only ever reconciles
 * records that already share an id. Redundant rows are soft-deleted (never hard-removed — the
 * usual 30-day tombstone GC still applies to them), and every Card/Topic that referenced one is
 * re-pointed to the surviving row.
 *
 * Purely local — reads and writes only this device's IndexedDB, no network involved. `syncNow`
 * calls this right after merging local and remote data (so cross-device duplicates are visible to
 * it), but it's just as meaningful to call standalone: it also cleans up duplicates that predate
 * Cloud Sync entirely, e.g. from a bug or a messy import, on a device that never syncs at all.
 */
export async function deduplicateLocalData(): Promise<void> {
  const [decks, topics, tags, cards] = await Promise.all([
    deckRepository.getAllIncludingDeleted(),
    topicRepository.getAllIncludingDeleted(),
    tagRepository.getAllIncludingDeleted(),
    cardRepository.getAllIncludingDeleted(),
  ]);

  const dedupedDecks = deduplicateByName(decks);
  const decksById = new Map(dedupedDecks.map((deck) => [deck.id, deck]));

  const now = Date.now();
  const healedTopics = topics.map((topic) => {
    const healedDeckId = healReference(decksById, topic.deckId) ?? topic.deckId;
    return healedDeckId === topic.deckId ? topic : { ...topic, deckId: healedDeckId, updatedAt: now };
  });
  const dedupedTopics = deduplicateByName(healedTopics, { scopeKey: (topic) => topic.deckId });
  const topicsById = new Map(dedupedTopics.map((topic) => [topic.id, topic]));

  const dedupedTags = deduplicateByName(tags);
  const tagsById = new Map(dedupedTags.map((tag) => [tag.id, tag]));

  const healedCards = cards.map((card): Card => {
    const healedDeckId = healReference(decksById, card.deckId) ?? card.deckId;
    const healedTopicId = healReference(topicsById, card.topicId, { scopeKey: (topic) => topic.deckId });
    const healedTagIds = card.tagIds.map((tagId) => healReference(tagsById, tagId) ?? tagId);

    const unchanged =
      healedDeckId === card.deckId &&
      healedTopicId === card.topicId &&
      healedTagIds.length === card.tagIds.length &&
      healedTagIds.every((tagId, index) => tagId === card.tagIds[index]);
    if (unchanged) return card;

    return { ...card, deckId: healedDeckId, topicId: healedTopicId, tagIds: healedTagIds, updatedAt: now };
  });

  // Index-aligned with the original reads throughout (every transform above preserves order and
  // length), and every unchanged entity kept its original object reference — so a plain `!==`
  // finds exactly what changed, without writing back rows that didn't need it.
  const changedDecks = dedupedDecks.filter((deck, index) => deck !== decks[index]);
  const changedTopics = dedupedTopics.filter((topic, index) => topic !== topics[index]);
  const changedTags = dedupedTags.filter((tag, index) => tag !== tags[index]);
  const changedCards = healedCards.filter((card, index) => card !== cards[index]);

  await Promise.all([
    changedDecks.length > 0 ? deckRepository.bulkPut(changedDecks) : undefined,
    changedTopics.length > 0 ? topicRepository.bulkPut(changedTopics) : undefined,
    changedTags.length > 0 ? tagRepository.bulkPut(changedTags) : undefined,
    changedCards.length > 0 ? cardRepository.bulkPut(changedCards) : undefined,
  ]);
}
