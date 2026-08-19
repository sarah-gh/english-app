export interface Deck {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export type NewDeck = Omit<Deck, 'id' | 'createdAt'>;
export type DeckUpdate = Partial<Omit<Deck, 'id' | 'createdAt'>>;
