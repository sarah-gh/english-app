import { useDeckStore } from '@/stores/deck-store';
import { useTagStore } from '@/stores/tag-store';
import { useTopicStore } from '@/stores/topic-store';
import { getRandomTagColor } from '@/utils/tag-color';

/**
 * Normalizes a name for matching only — never for storage. Trimming as well as lowercasing
 * matters: `merge.ts`'s `normalizeName` already trims when Cloud Sync collapses same-named
 * duplicates, so a resolver that only lowercased would happily create `" Grammar"` alongside an
 * existing `"Grammar"`, and the next sync would silently merge the two back together. Matching the
 * sync layer's rule here means the duplicate is never created in the first place.
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** One batch of resolutions — see `useEntityResolver` for why the cache is scoped this way. */
export interface EntityResolverBatch {
  /** Existing deck with this name (case-insensitive), or a newly created one. */
  deckId(name: string): Promise<string>;
  /** Topics are scoped per-deck, so the same topic name can be new under one deck and existing
   *  under another — the deck id is part of both the lookup and the cache key. */
  topicId(deckId: string, name: string): Promise<string>;
  /** Existing tag with this name (case-insensitive), or a newly created one with a random badge
   *  color from the app's palette. */
  tagId(name: string): Promise<string>;
}

/**
 * Resolve-or-create for the entities referenced by *name* rather than by id — what every import
 * path and the card editor's AI suggestions need when a file or the AI hands over "Vocabulary"
 * instead of a deck id.
 *
 * This used to be re-implemented in four places (the Excel importer, the JSON importer, the card
 * editor, and the seed script), which is how the rules drifted apart: the importers gave a new tag
 * a random palette color while the card editor hardcoded a single flat gray, and none of them
 * trimmed before matching. One implementation means one set of rules.
 *
 * Call the composable in `setup` (it reaches for Pinia stores), then start a fresh batch for each
 * user-initiated run. The cache lives on the batch, not the composable, because it maps a name to
 * an id at a moment in time: a long-lived cache would keep handing back the id of a deck the user
 * has since renamed or deleted. One batch per import run is exactly the lifetime the previous
 * hand-rolled `Map`s had.
 */
export function useEntityResolver() {
  const deckStore = useDeckStore();
  const topicStore = useTopicStore();
  const tagStore = useTagStore();

  function createBatch(): EntityResolverBatch {
    const cache = new Map<string, string>();

    async function resolve(
      cacheKey: string,
      find: () => { id: string } | undefined,
      create: () => Promise<{ id: string }>,
    ): Promise<string> {
      const cached = cache.get(cacheKey);
      if (cached) return cached;

      const entity = find() ?? (await create());
      cache.set(cacheKey, entity.id);
      return entity.id;
    }

    return {
      deckId(name) {
        const key = normalizeName(name);
        return resolve(
          `deck::${key}`,
          () => deckStore.decks.find((deck) => normalizeName(deck.name) === key),
          () => deckStore.add({ name: name.trim() }),
        );
      },

      topicId(deckId, name) {
        const key = normalizeName(name);
        return resolve(
          `topic::${deckId}::${key}`,
          () => topicStore.byDeck(deckId).find((topic) => normalizeName(topic.name) === key),
          () => topicStore.add({ deckId, name: name.trim() }),
        );
      },

      tagId(name) {
        const key = normalizeName(name);
        return resolve(
          `tag::${key}`,
          () => tagStore.tags.find((tag) => normalizeName(tag.name) === key),
          () => tagStore.add({ name: name.trim(), color: getRandomTagColor() }),
        );
      },
    };
  }

  return { createBatch };
}
