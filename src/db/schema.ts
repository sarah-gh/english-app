import Dexie, { type Table } from 'dexie';
import type { Card } from '@/types/card';
import type { Deck } from '@/types/deck';
import type { Tag } from '@/types/tag';
import type { AppSettings } from '@/types/settings';

export class AppDatabase extends Dexie {
  cards!: Table<Card, string>;
  decks!: Table<Deck, string>;
  tags!: Table<Tag, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('english-app-db');

    this.version(1).stores({
      cards: 'id, deckId, reviewStatus, *tagIds, createdAt',
      decks: 'id, name, createdAt',
      tags: 'id, name',
      settings: 'id',
    });
  }
}
