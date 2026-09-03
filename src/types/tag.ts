export interface Tag {
  id: string;
  name: string;
  /** Hex color, e.g. "#3b82f6". Tags are the only allowed source of color in the monochrome UI. */
  color: string;
  createdAt: number;
  updatedAt: number;
  /** Soft-delete flag — see `Card.isDeleted` for why deletes don't hard-remove the row. */
  isDeleted: boolean;
}

export type NewTag = Omit<Tag, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted'>;
export type TagUpdate = Partial<Omit<Tag, 'id' | 'createdAt'>>;
