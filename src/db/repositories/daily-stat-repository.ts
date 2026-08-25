import { db } from '@/db';
import type { DailyStat } from '@/types/daily-stat';
import { todayDateKey } from '@/utils/date';

export const dailyStatRepository = {
  async getAll(): Promise<DailyStat[]> {
    return db.dailyStats.toArray();
  },

  async getByDate(date: string): Promise<DailyStat | undefined> {
    return db.dailyStats.get(date);
  },

  async getByDates(dates: string[]): Promise<DailyStat[]> {
    const rows = await db.dailyStats.bulkGet(dates);
    return rows.filter((row): row is DailyStat => Boolean(row));
  },

  /** Upserts today's row, adding `count` to whatever was already logged today. */
  async incrementToday(count: number): Promise<DailyStat> {
    const date = todayDateKey();
    const existing = await db.dailyStats.get(date);
    const record: DailyStat = { date, cardsStudied: (existing?.cardsStudied ?? 0) + count };
    await db.dailyStats.put(record);
    return record;
  },

  async bulkPut(stats: DailyStat[]): Promise<void> {
    await db.dailyStats.bulkPut(stats);
  },

  async clear(): Promise<void> {
    await db.dailyStats.clear();
  },
};
