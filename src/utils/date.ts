/** Local-time 'YYYY-MM-DD' key — deliberately not `toISOString()`, which is UTC and would file
 *  a late-night session under the wrong day for users west of UTC. */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayDateKey(): string {
  return dateKey(new Date());
}

/** Returns `count` date keys ending today, oldest first (e.g. count=7 -> the last 7 days). */
export function lastNDateKeys(count: number): string[] {
  const keys: string[] = [];
  const cursor = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - i);
    keys.push(dateKey(day));
  }
  return keys;
}
