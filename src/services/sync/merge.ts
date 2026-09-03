export interface SyncableEntity {
  id: string;
  updatedAt: number;
}

export interface MergeResult<T extends SyncableEntity> {
  /** The full winning set — decks/topics/tags/cards as they should exist after this sync,
   *  local and remote combined. This is what gets written back to Google Drive. */
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

export interface NamedSyncEntity extends SyncableEntity {
  name: string;
  createdAt: number;
  isDeleted: boolean;
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

export interface DeduplicateByNameOptions<T> {
  /** For entities scoped under a parent — a Topic only duplicates another Topic if both their
   *  normalized name AND this key match (Topics use it for `deckId`, since two different decks
   *  can each legitimately have their own "General" topic). Global entities (Deck, Tag) omit it. */
  scopeKey?: (entity: T) => string;
}

/**
 * Collapses entities that share a normalized name (and `scopeKey`, if given) but have different
 * ids — the case `mergeById` can't catch on its own, since it only ever reconciles records that
 * already share an id. Two devices that each independently created a "Grammar" deck end up with
 * two different ids for what's conceptually one deck; this treats them as one, keeping a single
 * survivor id and soft-deleting the rest (never hard-removed — the usual 30-day tombstone GC still
 * applies to them).
 *
 * The survivor's id/`createdAt` come from whichever group member was created earliest, tie-broken
 * by id — both intrinsic to the records themselves rather than to whichever device happens to run
 * this, so two devices deduplicating the same merged data independently always agree on the same
 * survivor id. Its other fields (name, description, color, ...) instead come from whichever group
 * member was edited most recently, per the last-write-wins rule used everywhere else in sync.
 * Already-deleted entities are never grouped — a tombstone can't anchor a group or absorb another
 * record into it.
 *
 * Returns an array the same length as the input, with duplicates marked `isDeleted` rather than
 * removed, and preserves object identity for every untouched entity (so callers can tell what
 * changed with a simple `!==` instead of a deep comparison).
 */
export function deduplicateByName<T extends NamedSyncEntity>(
  entities: T[],
  options: DeduplicateByNameOptions<T> = {},
): T[] {
  const groups = new Map<string, T[]>();
  for (const entity of entities) {
    if (entity.isDeleted) continue;
    const key = options.scopeKey ? `${options.scopeKey(entity)}::${normalizeName(entity.name)}` : normalizeName(entity.name);
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
