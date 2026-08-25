/** One row per calendar day (local time, `'YYYY-MM-DD'`) a study session logged progress —
 *  the source of truth for the Dashboard's daily-goal ring and weekly streak row. */
export interface DailyStat {
  date: string;
  cardsStudied: number;
}
