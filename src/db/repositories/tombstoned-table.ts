import type { Table, UpdateSpec } from 'dexie';

/** The shape every soft-deletable row shares: a tombstone flag plus the timestamp Cloud Sync's
 *  last-write-wins merge resolves on. */
export interface Tombstoneable {
  isDeleted: boolean;
  updatedAt: number;
}

/**
 * Builds the tombstone-aware read/delete surface each soft-deletable repository is made of.
 *
 * The invariant these repositories rely on, "a deleted row still exists, and only Cloud Sync may
 * see it", used to be a three-line `excludeDeleted` helper copy-pasted into four files, applied
 * by hand at each read. That worked until it didn't: every repository's `getById` went straight to
 * `table.get(id)` and returned tombstones, quietly contradicting the sibling reads right next to
 * it. Building the surface from one factory means a repository can't be written that forgets, and
 * `getAllIncludingDeleted` stays the single, obvious, greppable way to see tombstones.
 *
 * `getAll` is deliberately *not* provided here: each table has its own natural order, and several
 * get it from a Dexie index (`orderBy('name')`) rather than a JS sort. Repositories compose their
 * own read and pass the rows through `live` instead, so the query plans are unchanged.
 */
export function tombstonedTable<T extends Tombstoneable>(table: Table<T, string>) {
  return {
    /** Drops tombstones from a row set the repository has already read in its own order. */
    live(rows: T[]): T[] {
      return rows.filter((row) => !row.isDeleted);
    },

    /** Used by Cloud Sync, which needs tombstones too so a deletion on one device replicates to
     *  the others instead of being invisible to the merge. */
    getAllIncludingDeleted(): Promise<T[]> {
      return table.toArray();
    },

    /** Resolves to `undefined` for a tombstoned row: to every caller except Cloud Sync, a deleted
     *  record is simply not found, the same answer they'd get from `getAll`. */
    async getById(id: string): Promise<T | undefined> {
      const row = await table.get(id);
      return row && !row.isDeleted ? row : undefined;
    },

    /** Marks the row deleted instead of removing it, so Cloud Sync can replicate the deletion to
     *  other devices as a change record. Permanently removed later by the garbage collector once
     *  the tombstone is 30+ days old. */
    async softDelete(id: string, timestamp = Date.now()): Promise<void> {
      // Dexie's `UpdateSpec<T>` is built from `KeyPaths<Required<T>>`, a recursive template-literal
      // type TypeScript can't evaluate while `T` is still an unresolved generic, so it can't see
      // that `isDeleted`/`updatedAt` are valid paths even though the `Tombstoneable` constraint
      // guarantees both exist. The double assertion is the narrowest way to say so; the constraint
      // above, not this cast, is what actually keeps it sound.
      await table.update(id, { isDeleted: true, updatedAt: timestamp } as unknown as UpdateSpec<T>);
    },
  };
}
