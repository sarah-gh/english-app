import type { DuplicateResolutionAction } from '@/types/duplicate-card';

/**
 * The single rule for "does this card already exist", shared by every save path (card editor,
 * AI-generated cards, JSON import, Excel import) so they can never drift apart.
 *
 * Matching is on `frontTitle` alone and is exact: character-for-character equality after
 * trimming leading/trailing whitespace, and nothing else. Case matters ("Apple" and "apple" are
 * two different cards), and there is deliberately no fuzzy matching, stemming, or plural
 * handling ("apple" and "apples" are two different cards). Deck and topic are ignored, so the
 * same word filed under two decks still counts as a duplicate for the user to resolve.
 *
 * Note this is intentionally *not* `cardDedupeKey` from `services/sync/merge.ts`, which
 * normalizes to lowercase and scopes by deck. That looser rule is right for silently collapsing
 * rows two devices created independently, but too aggressive to block a save the user asked for.
 */
export function exactFrontTitleKey(frontTitle: string): string {
  return frontTitle.trim();
}

/** The minimum shape needed to be matched, so both `Card` rows and the lighter summaries the
 *  importers carry around can be checked by the same functions. */
export interface DuplicateCandidateCard {
  id: string;
  frontTitle: string;
  isDeleted?: boolean;
}

/** Indexes cards by their exact title for repeated lookups (batch imports check every row).
 *  Tombstoned cards are skipped, and the first card to claim a title wins, so a title that was
 *  already duplicated in the database resolves to a stable, predictable card. */
export function buildExactFrontTitleIndex<T extends DuplicateCandidateCard>(
  cards: T[],
): Map<string, T> {
  const index = new Map<string, T>();
  for (const card of cards) {
    if (card.isDeleted) continue;
    const key = exactFrontTitleKey(card.frontTitle);
    if (!index.has(key)) index.set(key, card);
  }
  return index;
}

/** Finds the active card that exactly matches `frontTitle`, if any. `excludeId` skips the card
 *  being edited, so re-saving a card without renaming it isn't flagged against itself. */
export function findExactDuplicateCard<T extends DuplicateCandidateCard>(
  frontTitle: string,
  cards: T[],
  excludeId?: string,
): T | undefined {
  const key = exactFrontTitleKey(frontTitle);
  if (key.length === 0) return undefined;
  return cards.find(
    (card) => !card.isDeleted && card.id !== excludeId && exactFrontTitleKey(card.frontTitle) === key,
  );
}

/** What an incoming card collided with: a card already in the database, or an earlier card in
 *  the same batch (file). */
export type BatchDuplicateMatch<TIncoming, TExisting> =
  | { source: 'database'; card: TExisting }
  | { source: 'file'; card: TIncoming };

export interface BatchDuplicateConflict<TIncoming, TExisting> {
  incoming: TIncoming;
  match: BatchDuplicateMatch<TIncoming, TExisting>;
}

/**
 * Flags every incoming card in a batch whose title exactly matches something already saved or an
 * earlier card in the same batch. Shared by the JSON and Excel importers so both files behave
 * identically.
 *
 * A database match always wins over an in-batch one: if a title was already saved, every incoming
 * card carrying it conflicts with the saved card rather than with its neighbours. Otherwise the
 * first incoming card to claim a title is treated as the original, and each later card carrying
 * that title is flagged against that same first one (never chained to another duplicate, which
 * would strand the user's choice if they dropped the middle card).
 */
export function detectBatchDuplicates<
  TIncoming extends { frontTitle: string },
  TExisting extends DuplicateCandidateCard,
>(incoming: TIncoming[], existingCards: TExisting[]): BatchDuplicateConflict<TIncoming, TExisting>[] {
  const existingByTitle = buildExactFrontTitleIndex(existingCards);
  const firstSeenInBatch = new Map<string, TIncoming>();
  const conflicts: BatchDuplicateConflict<TIncoming, TExisting>[] = [];

  for (const card of incoming) {
    const key = exactFrontTitleKey(card.frontTitle);
    const databaseMatch = existingByTitle.get(key);
    if (databaseMatch) {
      conflicts.push({ incoming: card, match: { source: 'database', card: databaseMatch } });
      continue;
    }

    const batchMatch = firstSeenInBatch.get(key);
    if (batchMatch) {
      conflicts.push({ incoming: card, match: { source: 'file', card: batchMatch } });
    } else {
      firstSeenInBatch.set(key, card);
    }
  }

  return conflicts;
}

export interface ResolvedBatchImport<TIncoming, TExisting> {
  /** Cards to insert as new rows, in original batch order. */
  toCreate: TIncoming[];
  /** Cards that should update an existing database row in place instead of inserting. */
  toOverwrite: { incoming: TIncoming; existing: TExisting }[];
}

/**
 * Applies the user's per-conflict choices to a batch, so the preview UI and the code that
 * actually writes to IndexedDB always agree on what happens. A conflict with no recorded choice
 * defaults to `skip`, the safe outcome of never silently duplicating or replacing anything.
 *
 * `overwrite` against a database match updates that saved row; against an in-batch match it
 * instead drops the earlier card of the pair, since there's nothing saved yet to update and the
 * user is really saying "use this later one". `keep-both` imports the incoming card untouched.
 */
export function resolveBatchDuplicates<TIncoming, TExisting>(
  incoming: TIncoming[],
  conflicts: BatchDuplicateConflict<TIncoming, TExisting>[],
  resolutions: Map<number, DuplicateResolutionAction>,
  keyOf: (card: TIncoming) => number,
): ResolvedBatchImport<TIncoming, TExisting> {
  const excludedKeys = new Set<number>();
  const overwriteTargetByKey = new Map<number, TExisting>();

  for (const conflict of conflicts) {
    const key = keyOf(conflict.incoming);
    const action = resolutions.get(key) ?? 'skip';
    if (action === 'skip') {
      excludedKeys.add(key);
    } else if (action === 'overwrite') {
      if (conflict.match.source === 'database') {
        overwriteTargetByKey.set(key, conflict.match.card);
      } else {
        excludedKeys.add(keyOf(conflict.match.card));
      }
    }
  }

  const toCreate: TIncoming[] = [];
  const toOverwrite: { incoming: TIncoming; existing: TExisting }[] = [];

  for (const card of incoming) {
    const key = keyOf(card);
    if (excludedKeys.has(key)) continue;

    const existing = overwriteTargetByKey.get(key);
    if (existing) toOverwrite.push({ incoming: card, existing });
    else toCreate.push(card);
  }

  return { toCreate, toOverwrite };
}
