export interface Topic {
  id: string;
  deckId: string;
  name: string;
  description?: string;
  createdAt: number;
}

export type NewTopic = Omit<Topic, 'id' | 'createdAt'>;
export type TopicUpdate = Partial<Omit<Topic, 'id' | 'createdAt' | 'deckId'>>;
