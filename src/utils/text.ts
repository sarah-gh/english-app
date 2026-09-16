/** Uppercases only the first character of `str`, leaving the rest of its casing untouched (e.g.
 *  "so vs. such" -> "So vs. such"). Unlike Tailwind's `capitalize` class or CSS `text-transform:
 *  capitalize`, this doesn't title-case every word. */
export function capitalizeFirstLetter(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
