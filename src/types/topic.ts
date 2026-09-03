export interface Topic {
  id: string;
  deckId: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  /** Soft-delete flag — see `Card.isDeleted` for why deletes don't hard-remove the row. */
  isDeleted: boolean;
}

export type NewTopic = Omit<Topic, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>;
export type TopicUpdate = Partial<Omit<Topic, 'id' | 'createdAt' | 'deckId'>>;
