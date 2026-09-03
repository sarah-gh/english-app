export interface Deck {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  /** Soft-delete flag — see `Card.isDeleted` for why deletes don't hard-remove the row. */
  isDeleted: boolean;
}

export type NewDeck = Omit<Deck, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>;
export type DeckUpdate = Partial<Omit<Deck, 'id' | 'createdAt'>>;
