/** What the user chose to do about one duplicate: keep what's already saved and drop the
 *  incoming card, replace the saved card with the incoming one, or keep both side by side. */
export type DuplicateResolutionAction = 'skip' | 'overwrite' | 'keep-both';

/** One side of the existing-vs-incoming comparison the duplicate modals render. Deliberately
 *  display-only strings so every save path (card editor, JSON import, Excel import) can describe
 *  its own shape of card without the modals knowing anything about `Card`, `ParsedImportCard`,
 *  or `ParsedCardRow`. */
export interface DuplicateCardSide {
  frontTitle: string;
  deckName: string;
  topicName?: string;
  /** Rich-text HTML or plain text, the comparison strips tags and truncates it. */
  summary: string;
  /** Epoch ms, shown only for cards that are already saved. */
  createdAt?: number;
}

/** One duplicate awaiting a decision, in the shape the modals consume. */
export interface DuplicateConflictItem {
  /** Identifies the incoming card within its own batch: the JSON importer's `sourceIndex`, the
   *  Excel importer's `rowNumber`, or 0 for a single card being saved from the editor. */
  key: number;
  existing: DuplicateCardSide;
  incoming: DuplicateCardSide;
  /** Caption explaining what was matched, e.g. "Already in your library" or "Row 4 above". */
  matchLabel: string;
  /** False when replacing makes no sense for this conflict, so the modal hides that action. Set
   *  for a card being *edited* into a collision with a different card: overwriting there would
   *  mean folding two saved cards into one, which is a deletion the user never asked for. */
  canOverwrite: boolean;
}
