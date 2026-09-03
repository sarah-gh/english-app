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

/** e.g. "Just now", "5 min ago", "3 hr ago", "2 days ago" — used for "Last synced: …" feedback. */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}
