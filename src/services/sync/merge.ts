export interface SyncableEntity {
  id: string;
  updatedAt: number;
}

/** Shared by every merge function below, regardless of how each resolves a conflict. Not
 *  constrained to `SyncableEntity` itself — `mergeDailyStats` reuses this shape for a `T` that has
 *  no `id`/`updatedAt` (see its own doc comment). */
export interface MergeResult<T> {
  /** The full winning set — decks/topics/tags/cards/quiz-history/daily-stats as they should exist
   *  after this sync, local and remote combined. This is what gets written back to Google Drive. */
  merged: T[];
  /** The subset of `merged` that didn't already match what's on this device — either brand new
   *  from another device, or a newer edit of a record this device also has. This is what needs
   *  writing into IndexedDB. */
  toApplyLocally: T[];
}

/**
 * Two-way, last-write-wins merge by `id`, matching the sync algorithm's field/record-level
 * resolution rules: unique-to-local records are kept as-is (they'll reach the other device on
 * upload), unique-to-remote records are adopted locally, and records present on both sides are
 * resolved by comparing `updatedAt` — the newer one wins, and a tie changes nothing (favors the
 * local copy already in hand rather than triggering a needless local write).
 */
export function mergeById<T extends SyncableEntity>(local: T[], remote: T[]): MergeResult<T> {
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()]);

  const merged: T[] = [];
  const toApplyLocally: T[] = [];

  for (const id of ids) {
    const localItem = localById.get(id);
    const remoteItem = remoteById.get(id);

    if (localItem && remoteItem) {
      if (remoteItem.updatedAt > localItem.updatedAt) {
        merged.push(remoteItem);
        toApplyLocally.push(remoteItem);
      } else {
        merged.push(localItem);
      }
    } else if (localItem) {
      merged.push(localItem);
    } else if (remoteItem) {
      merged.push(remoteItem);
      toApplyLocally.push(remoteItem);
    }
  }

  return { merged, toApplyLocally };
}

export interface CardLike extends SyncableEntity {
  studyCount: number;
}

/**
 * Card merge is `mergeById`'s whole-record last-write-wins for every field *except*
 * `studyCount`, which is resolved separately as `Math.max(local, remote)` and spliced into
 * whichever record won the rest of the fields. Plain last-write-wins would let whichever device's
 * `updatedAt` happens to be newer silently discard the *other* device's study reps entirely — e.g.
 * device A studies a card 3 times, device B (offline, never synced yet) studies that same card
 * twice; if B's edit happens to be the more recent one, a plain merge would drop to `studyCount: 2`
 * and lose A's 3 reps outright. Taking the max instead means a device's study count can only ever
 * go up from a sync, never down, regardless of which side's other fields won.
 *
 * `toApplyLocally` still only includes records that actually need a local write — usually because
 * the whole record lost (same as `mergeById`), but also when the record's other fields locally
 * *won* yet its `studyCount` still needed bumping up to the remote side's higher count.
 */
export function mergeCards<T extends CardLike>(local: T[], remote: T[]): MergeResult<T> {
  const localById = new Map(local.map((item) => [item.id, item]));
  const remoteById = new Map(remote.map((item) => [item.id, item]));
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()]);

  const merged: T[] = [];
  const toApplyLocally: T[] = [];

  for (const id of ids) {
    const localItem = localById.get(id);
    const remoteItem = remoteById.get(id);

    if (localItem && remoteItem) {
      const winner = remoteItem.updatedAt > localItem.updatedAt ? remoteItem : localItem;
      const studyCount = Math.max(localItem.studyCount, remoteItem.studyCount);
      const resolved = studyCount === winner.studyCount ? winner : { ...winner, studyCount };
      merged.push(resolved);
      if (resolved !== localItem) toApplyLocally.push(resolved);
    } else if (localItem) {
      merged.push(localItem);
    } else if (remoteItem) {
      merged.push(remoteItem);
      toApplyLocally.push(remoteItem);
    }
  }

  return { merged, toApplyLocally };
}

export interface DailyStatLike {
  date: string;
  cardsStudied: number;
}

/**
 * Merges `DailyStat` rows by `date`, taking whichever side counted *more* cards studied that day.
 * This deliberately isn't `mergeById`'s last-write-wins-by-`updatedAt` — `DailyStat` has no
 * `updatedAt` (it's an aggregate counter, not a user-edited record), and summing local + remote on
 * every sync would double-count: device A studies 5, syncs (remote becomes 5); device B, already
 * at 3, syncs and sums to 8; if device A syncs again with no new studying, summing its local 5
 * against remote's 8 would wrongly produce 13. Taking the max is idempotent — re-running the same
 * sync twice never changes the result — at the cost of undercounting the one genuine edge case of
 * two *different* devices both studying that same calendar day while both fully offline from each
 * other (whichever counted fewer that day is the one that's lost, not summed in).
 */
export function mergeDailyStats<T extends DailyStatLike>(local: T[], remote: T[]): MergeResult<T> {
  const localByDate = new Map(local.map((stat) => [stat.date, stat]));
  const remoteByDate = new Map(remote.map((stat) => [stat.date, stat]));
  const dates = new Set<string>([...localByDate.keys(), ...remoteByDate.keys()]);

  const merged: T[] = [];
  const toApplyLocally: T[] = [];

  for (const date of dates) {
    const localStat = localByDate.get(date);
    const remoteStat = remoteByDate.get(date);

    if (localStat && remoteStat) {
      if (remoteStat.cardsStudied > localStat.cardsStudied) {
        merged.push(remoteStat);
        toApplyLocally.push(remoteStat);
      } else {
        merged.push(localStat);
      }
    } else if (localStat) {
      merged.push(localStat);
    } else if (remoteStat) {
      merged.push(remoteStat);
      toApplyLocally.push(remoteStat);
    }
  }

  return { merged, toApplyLocally };
}

export interface SingletonMergeResult<T> {
  /** The winning record — what both this device and the uploaded payload should end up with. */
  merged: T;
  /** Whether `merged` differs from `local` and needs writing into IndexedDB. */
  toApplyLocally: boolean;
}

/**
 * Whole-record last-write-wins merge for a singleton record (there's exactly one — e.g. the app's
 * settings — rather than a collection keyed by id), resolved the same way as `mergeById` resolves
 * a single id: the side with the newer `updatedAt` wins outright, and a missing remote record (no
 * prior sync, or a payload from before this record type existed) just keeps the local one as-is.
 */
export function mergeSingleton<T extends { updatedAt: number }>(local: T, remote: T | undefined): SingletonMergeResult<T> {
  if (!remote || local.updatedAt >= remote.updatedAt) {
    return { merged: local, toApplyLocally: false };
  }
  return { merged: remote, toApplyLocally: true };
}

export interface NamedSyncEntity extends SyncableEntity {
  name: string;
  createdAt: number;
  isDeleted: boolean;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

interface DedupableEntity extends SyncableEntity {
  createdAt: number;
  isDeleted: boolean;
}

/**
 * Collapses entities that share a `keyOf` key but have different ids — the case `mergeById` can't
 * catch on its own, since it only ever reconciles records that already share an id. Two devices
 * that each independently created what's conceptually the same record (e.g. both seeded a
 * "Grammar" deck, or both created a default card with the same front text in the same deck) end up
 * with two different ids for it; this treats them as one, keeping a single survivor id and
 * soft-deleting the rest (never hard-removed — the usual 30-day tombstone GC still applies to
 * them).
 *
 * The survivor's id/`createdAt` come from whichever group member was created earliest, tie-broken
 * by id — both intrinsic to the records themselves rather than to whichever device happens to run
 * this, so two devices deduplicating the same merged data independently always agree on the same
 * survivor id (an "updatedAt" tiebreak would work just as well for that agreement, but would let
 * the surviving id drift to a different record every time a losing duplicate got edited more
 * recently — earliest-`createdAt` gives the merged record a stable identity instead). Its other
 * fields instead come from whichever group member was edited most recently, per the last-write-wins
 * rule used everywhere else in sync — so the surviving record's *content* is still always the
 * newest version, only its *id* is pinned. Already-deleted entities are never grouped — a
 * tombstone can't anchor a group or absorb another record into it.
 *
 * Returns an array the same length as the input, with duplicates marked `isDeleted` rather than
 * removed, and preserves object identity for every untouched entity (so callers can tell what
 * changed with a simple `!==` instead of a deep comparison).
 */
function deduplicateByKey<T extends DedupableEntity>(entities: T[], keyOf: (entity: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const entity of entities) {
    if (entity.isDeleted) continue;
    const key = keyOf(entity);
    const group = groups.get(key);
    if (group) group.push(entity);
    else groups.set(key, [entity]);
  }

  const replacements = new Map<string, T>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;

    const primary = [...group].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))[0];
    const mostRecentlyEdited = group.reduce((latest, entity) => (entity.updatedAt > latest.updatedAt ? entity : latest));
    const now = Date.now();

    replacements.set(primary.id, {
      ...mostRecentlyEdited,
      id: primary.id,
      createdAt: primary.createdAt,
      isDeleted: false,
      updatedAt: now,
    });
    for (const entity of group) {
      if (entity.id === primary.id) continue;
      replacements.set(entity.id, { ...entity, isDeleted: true, updatedAt: now });
    }
  }

  if (replacements.size === 0) return entities;
  return entities.map((entity) => replacements.get(entity.id) ?? entity);
}

export interface DeduplicateByNameOptions<T> {
  /** For entities scoped under a parent — a Topic only duplicates another Topic if both their
   *  normalized name AND this key match (Topics use it for `deckId`, since two different decks
   *  can each legitimately have their own "General" topic). Global entities (Deck, Tag) omit it. */
  scopeKey?: (entity: T) => string;
}

/** Collapses Deck/Topic/Tag rows that share a normalized `name` (and `scopeKey`, if given) but
 *  have different ids. See `deduplicateByKey` for the resolution rules. */
export function deduplicateByName<T extends NamedSyncEntity>(
  entities: T[],
  options: DeduplicateByNameOptions<T> = {},
): T[] {
  return deduplicateByKey(entities, (entity) =>
    options.scopeKey ? `${options.scopeKey(entity)}::${normalizeName(entity.name)}` : normalizeName(entity.name),
  );
}

export interface DedupableCard extends DedupableEntity {
  deckId: string;
  frontTitle: string;
  studyCount: number;
}

function cardDedupeKey(card: DedupableCard): string {
  return `${card.deckId}::${normalizeName(card.frontTitle)}`;
}

/** Collapses Cards that share a `deckId` and a normalized `frontTitle` but have different ids —
 *  the default-cards-created-independently-on-two-devices case. Uses `deduplicateByKey`'s usual
 *  resolution rules (same policy as `deduplicateByName`, just keyed on deck + front text instead
 *  of a `name` field, since Card has no `name`), except for `studyCount`: `deduplicateByKey` takes
 *  every field from whichever duplicate was edited most recently, which for `studyCount` would let
 *  a duplicate whose `updatedAt` was bumped by something *other* than studying (e.g. a Practice
 *  swipe changing `reviewStatus`) silently discard a less-recently-touched duplicate's higher
 *  study count. Patched to `Math.max` across the whole group instead, the same fix `mergeCards`
 *  makes for the id-based sync merge and for the identical reason.
 */
export function deduplicateCards<T extends DedupableCard>(cards: T[]): T[] {
  const deduped = deduplicateByKey(cards, cardDedupeKey);
  if (deduped === cards) return deduped;

  const maxStudyCountByKey = new Map<string, number>();
  for (const card of cards) {
    if (card.isDeleted) continue;
    const key = cardDedupeKey(card);
    maxStudyCountByKey.set(key, Math.max(maxStudyCountByKey.get(key) ?? 0, card.studyCount));
  }

  return deduped.map((card) => {
    if (card.isDeleted) return card;
    const maxStudyCount = maxStudyCountByKey.get(cardDedupeKey(card));
    return maxStudyCount !== undefined && card.studyCount !== maxStudyCount
      ? { ...card, studyCount: maxStudyCount }
      : card;
  });
}

/**
 * Follows a reference (e.g. a Card's `deckId`) to a live entity when the one it currently points
 * to has just been tombstoned by `deduplicateByName` — or was tombstoned by an earlier
 * deduplication pass this device never directly saw (e.g. another device ran it first). Heals by
 * name rather than a remap table, so it self-corrects regardless of when or on which device the
 * original duplicate was collapsed, as long as a live same-named replacement still exists.
 * Returns the input unchanged if it's already live, or if no live replacement can be found.
 */
export function healReference<T extends NamedSyncEntity>(
  entitiesById: Map<string, T>,
  referencedId: string | undefined,
  options: { scopeKey?: (entity: T) => string } = {},
): string | undefined {
  if (!referencedId) return referencedId;
  const referenced = entitiesById.get(referencedId);
  if (!referenced || !referenced.isDeleted) return referencedId;

  const targetName = normalizeName(referenced.name);
  const targetScope = options.scopeKey?.(referenced);
  for (const candidate of entitiesById.values()) {
    if (candidate.isDeleted || normalizeName(candidate.name) !== targetName) continue;
    if (options.scopeKey && options.scopeKey(candidate) !== targetScope) continue;
    return candidate.id;
  }
  return referencedId;
}
