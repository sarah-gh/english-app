/** Every deck always has (or lazily gets) a topic by this name — the fallback any card lands in
 *  when no topic was explicitly chosen, so cards never show up orphaned in deck/topic browsing. */
export const GENERAL_TOPIC_NAME = 'General';

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
