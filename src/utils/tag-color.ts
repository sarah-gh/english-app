/** Vibrant, readable badge colors (Tailwind ~500 shades) — matches the palette used for the
 *  app's own seed-data tags, so auto-created tags fit the existing visual language. */
const TAG_COLOR_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#f97316', // orange
  '#ec4899', // pink
  '#10b981', // emerald
  '#ef4444', // red
  '#eab308', // yellow
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f43f5e', // rose
] as const;

/** Picks a random color for a newly auto-created tag (e.g. one discovered during import) instead
 *  of leaving every such tag the same flat gray. */
export function getRandomTagColor(): string {
  return TAG_COLOR_PALETTE[Math.floor(Math.random() * TAG_COLOR_PALETTE.length)];
}
