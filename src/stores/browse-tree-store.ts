import { defineStore } from 'pinia';
import { reactive } from 'vue';

/** Which decks are expanded in the Browse Cards accordion. Lives in a store (rather than
 *  view-local state) so it survives navigating away to a topic's card list and back during
 *  the same session. */
export const useBrowseTreeStore = defineStore('browse-tree', () => {
  const expandedDeckIds = reactive(new Set<string>());

  function isExpanded(deckId: string): boolean {
    return expandedDeckIds.has(deckId);
  }

  function expand(deckId: string): void {
    expandedDeckIds.add(deckId);
  }

  function toggle(deckId: string): void {
    if (expandedDeckIds.has(deckId)) expandedDeckIds.delete(deckId);
    else expandedDeckIds.add(deckId);
  }

  return { expandedDeckIds, isExpanded, expand, toggle };
});
