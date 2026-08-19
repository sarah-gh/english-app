export interface Tag {
  id: string;
  name: string;
  /** Hex color, e.g. "#3b82f6". Tags are the only allowed source of color in the monochrome UI. */
  color: string;
  createdAt: number;
}

export type NewTag = Omit<Tag, 'id' | 'createdAt'>;
export type TagUpdate = Partial<Omit<Tag, 'id' | 'createdAt'>>;
