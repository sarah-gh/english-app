import type { Table } from 'dexie';
import { db } from '@/db';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface Tombstoneable {
  isDeleted: boolean;
  updatedAt: number;
}

async function purgeTable<T extends Tombstoneable>(table: Table<T, string>, cutoff: number): Promise<void> {
  // `isDeleted` isn't a Dexie index (IndexedDB can't index booleans), so this is a full-table
  // scan-and-filter rather than a `.where()` query — acceptable given how rarely GC runs and how
  // small these tables are for a flashcard app.
  const staleIds = await table.filter((record) => record.isDeleted && record.updatedAt < cutoff).primaryKeys();
  if (staleIds.length > 0) await table.bulkDelete(staleIds);
}

/**
 * Hard-deletes soft-deleted (`isDeleted: true`) rows older than 30 days. Safe to call on every
 * app launch — deletions only take effect once a tombstone has had a full month to reach every
 * device through Cloud Sync, so purging it locally can no longer resurrect the record elsewhere.
 */
export async function purgeOldSoftDeletes(now = Date.now()): Promise<void> {
  const cutoff = now - THIRTY_DAYS_MS;
  await Promise.all([
    purgeTable(db.cards, cutoff),
    purgeTable(db.decks, cutoff),
    purgeTable(db.topics, cutoff),
    purgeTable(db.tags, cutoff),
  ]);
}
